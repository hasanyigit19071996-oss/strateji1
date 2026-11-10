const BASE = "https://v3.football.api-sports.io";

async function call(path) {
  const r = await fetch(BASE + path, {
    headers: { "x-apisports-key": process.env.APIFOOTBALL_KEY },
  });
  if (!r.ok) throw new Error("API " + r.status);
  return r.json();
}

function stat(team, type) {
  const x = (team?.statistics || []).find((s) => s.type === type);
  return Number(x?.value) || 0;
}

export default async function handler(req, res) {
  try {
    if (!process.env.APIFOOTBALL_KEY) return res.status(200).json([]);
    const live = await call("/fixtures?live=all");
    const top = (live.response || []).slice(0, 6);
    const rows = await Promise.all(
      top.map(async (f) => {
        const st = await call("/fixtures/statistics?fixture=" + f.fixture.id);
        const [a, b] = st.response || [];
        const sum = (t) => stat(a, t) + stat(b, t);
        return [
          f.teams.home.name,
          f.teams.away.name,
          (f.fixture.status.elapsed || 0) + "\u2019",
          (f.goals.home ?? 0) + "-" + (f.goals.away ?? 0),
          sum("Shots on Goal"),
          sum("Shots off Goal"),
          sum("Corner Kicks"),
          sum("Shots insidebox"),
        ];
      })
    );
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");
    res.status(200).json(rows);
  } catch (e) {
    res.status(200).json([]);
  }
}
