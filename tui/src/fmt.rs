//! Text at a width, and times as the kit writes them.

use unicode_width::{UnicodeWidthChar, UnicodeWidthStr};

/// How many columns a string takes.
pub fn width(s: &str) -> usize {
    UnicodeWidthStr::width(s)
}

pub fn char_width(c: char) -> usize {
    UnicodeWidthChar::width(c).unwrap_or(0)
}

/// Cut to `w` columns, with an ellipsis when anything was cut.
pub fn fit(s: &str, w: usize) -> String {
    if width(s) <= w {
        return s.to_string();
    }
    if w == 0 {
        return String::new();
    }
    let mut out = String::new();
    let mut used = 0;
    for c in s.chars() {
        let cw = char_width(c);
        if used + cw > w - 1 {
            break;
        }
        out.push(c);
        used += cw;
    }
    out.push('…');
    out
}

/// Padded or cut to exactly `w` columns.
pub fn pad(s: &str, w: usize) -> String {
    let s = fit(s, w);
    let n = width(&s);
    format!("{s}{}", " ".repeat(w.saturating_sub(n)))
}

/// Right-aligned in exactly `w` columns.
pub fn rpad(s: &str, w: usize) -> String {
    let s = fit(s, w);
    let n = width(&s);
    format!("{}{s}", " ".repeat(w.saturating_sub(n)))
}

/// "just now", "5m ago", "3d ago", "in 2h", as the kit's `ago` writes them.
pub fn ago(at: i64, now: i64) -> String {
    let seconds = (now - at) as f64 / 1000.0;
    let s = seconds.abs();
    if s < 45.0 {
        return "just now".into();
    }
    let (n, unit) = if s < 3600.0 {
        (s / 60.0, "m")
    } else if s < 86_400.0 {
        (s / 3600.0, "h")
    } else if s < 86_400.0 * 30.0 {
        (s / 86_400.0, "d")
    } else if s < 86_400.0 * 365.0 {
        (s / 86_400.0 / 30.0, "mo")
    } else {
        (s / 86_400.0 / 365.0, "y")
    };
    let k = n.round().max(1.0) as i64;
    if seconds >= 0.0 { format!("{k}{unit} ago") } else { format!("in {k}{unit}") }
}

/// "22,882"; "1.5"; "–" for what isn't a number.
pub fn number(n: f64) -> String {
    if !n.is_finite() {
        return "–".into();
    }
    let a = n.abs();
    if a >= 1e9 {
        return format!("{}B", trim(n / 1e9, 1));
    }
    if a >= 1e6 {
        return format!("{}M", trim(n / 1e6, 1));
    }
    if a >= 1e4 {
        return format!("{}k", trim(n / 1e3, 1));
    }
    let whole = if n.fract() == 0.0 { format!("{}", n.abs() as i64) } else { trim(n.abs(), 2) };
    let (int, frac) =
        whole.split_once('.').map(|(a, b)| (a.to_string(), Some(b.to_string()))).unwrap_or((whole.clone(), None));
    let mut grouped = String::new();
    for (i, c) in int.chars().enumerate() {
        if i > 0 && (int.len() - i).is_multiple_of(3) {
            grouped.push(',');
        }
        grouped.push(c);
    }
    format!("{}{grouped}{}", if n < 0.0 { "-" } else { "" }, frac.map(|f| format!(".{f}")).unwrap_or_default())
}

fn trim(n: f64, places: usize) -> String {
    let s = format!("{n:.places$}");
    if s.contains('.') { s.trim_end_matches('0').trim_end_matches('.').to_string() } else { s }
}

/// "14:05", in local time.
pub fn clock(at: i64) -> String {
    chrono::DateTime::from_timestamp_millis(at)
        .map(|d| d.with_timezone(&chrono::Local).format("%H:%M").to_string())
        .unwrap_or_default()
}

/// "Fri 14:05", as the browser's bar shows the time.
pub fn day_clock(at: i64) -> String {
    chrono::DateTime::from_timestamp_millis(at)
        .map(|d| d.with_timezone(&chrono::Local).format("%a %H:%M").to_string())
        .unwrap_or_default()
}

/// Wraps text to `w` columns, breaking at spaces, and inside words longer than a line.
pub fn wrap(s: &str, w: usize) -> Vec<String> {
    let w = w.max(1);
    let mut out = Vec::new();
    for para in s.split('\n') {
        let mut line = String::new();
        let mut used = 0;
        for word in para.split(' ') {
            let ww = width(word);
            if used > 0 && used + 1 + ww > w {
                out.push(std::mem::take(&mut line));
                used = 0;
            }
            if used > 0 {
                line.push(' ');
                used += 1;
            }
            if ww > w {
                for c in word.chars() {
                    let cw = char_width(c);
                    if used + cw > w {
                        out.push(std::mem::take(&mut line));
                        used = 0;
                    }
                    line.push(c);
                    used += cw;
                }
            } else {
                line.push_str(word);
                used += ww;
            }
        }
        out.push(line);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn times_as_the_kit_writes_them() {
        let now = 1_000_000_000_000;
        assert_eq!(ago(now - 20_000, now), "just now");
        assert_eq!(ago(now - 5 * 60_000, now), "5m ago");
        assert_eq!(ago(now - 26 * 3_600_000, now), "1d ago");
        assert_eq!(ago(now + 2 * 3_600_000, now), "in 2h");
    }

    #[test]
    fn numbers_as_the_kit_writes_them() {
        assert_eq!(number(1269.0), "1,269");
        assert_eq!(number(50_000.0), "50k");
        assert_eq!(number(1_020_000.0), "1M");
        assert_eq!(number(16.5), "16.5");
        assert_eq!(number(-3.0), "-3");
    }

    #[test]
    fn fitting_and_wrapping() {
        assert_eq!(fit("night-market", 6), "night…");
        assert_eq!(pad("ab", 4), "ab  ");
        assert_eq!(rpad("12", 4), "  12");
        assert_eq!(wrap("the grid is faster", 8), ["the grid", "is", "faster"]);
        assert_eq!(wrap("abcdefghij", 4), ["abcd", "efgh", "ij"]);
        assert_eq!(width("漢字"), 4);
    }
}
