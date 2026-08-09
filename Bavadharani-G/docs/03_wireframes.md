# UI Wireframes & Workflow Planning

Wireframes are in `docs/wireframes/`: `login.svg`, `register.svg`,
`athlete_profile.svg`.

## User Flow (full app)

```
Register (choose role) -> Login -> Dashboard
                                       |
                    +------------------+------------------+
                    |                                      |
               Profile page                          Videos page
          (edit athlete details)          (upload -> analyze -> assess risk)
```

## Screens

| Screen | Purpose |
|---|---|
| Login / Register | Auth entry points |
| Dashboard | Aggregate stats: total videos, avg quality/risk, risk trend chart |
| Videos | Upload mp4, trigger pose analysis, trigger risk assessment, view skeleton overlay |
| Profile | Athlete details (sport, position, physical stats, injury history) |
