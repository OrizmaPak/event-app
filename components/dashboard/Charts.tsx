export function ResponseAreaChart() {
  return <div className="response-chart"><div className="chart-y"><span>300</span><span>200</span><span>100</span><span>0</span></div><svg viewBox="0 0 720 240" preserveAspectRatio="none" role="img" aria-label="Guest responses rising over seven days"><defs><linearGradient id="dashArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--brand)" stopOpacity=".28" /><stop offset="1" stopColor="var(--brand)" stopOpacity="0" /></linearGradient></defs><path className="chart-grid" d="M0 40H720M0 100H720M0 160H720M0 220H720" /><path className="chart-area" d="M0 205 C55 198 75 190 115 182 S176 192 220 151 S290 169 335 122 S410 142 455 98 S540 115 585 64 S665 78 720 29 L720 240 L0 240Z" /><path className="chart-line" d="M0 205 C55 198 75 190 115 182 S176 192 220 151 S290 169 335 122 S410 142 455 98 S540 115 585 64 S665 78 720 29" /><circle cx="720" cy="29" r="6" /></svg><div className="chart-x"><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span><span>Mon</span><span>Tue</span></div></div>;
}

export function CheckInBars() {
  const values = [44, 69, 53, 82, 91, 76, 62, 88, 70, 96, 84, 72];
  return <div className="checkin-bars" aria-label="Check-in volume by fifteen-minute period">{values.map((value, index) => <i key={index} style={{ height: `${value}%` }}><span>{value}</span></i>)}</div>;
}

export function Donut({ value, label }: { value: number; label: string }) {
  return <div className="dashboard-donut" style={{ background: `conic-gradient(var(--brand) 0 ${value}%, var(--paper-2) ${value}% 100%)` }}><span><b>{value}%</b><small>{label}</small></span></div>;
}
