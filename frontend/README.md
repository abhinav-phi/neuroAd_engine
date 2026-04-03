```
neuroAd_engine/
├── .gitignore
├── LICENSE
├── README.md
├── calibration/
│   ├── README.md
│   ├── calibrate.py
│   └── coefficients.v1.json
├── data/
│   └── .gitkeep
├── docs/
│   ├── member-ownership.md
│   ├── project-context.md
│   └── tribev2-notes.md
├── frontend/
│   ├── .eslintrc.cjs
│   ├── .gitignore
│   ├── README.md
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ActionPanel.tsx
│   │   │   ├── CenterPanel.tsx
│   │   │   ├── CognitiveMetricsPanel.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── GradingModal.tsx
│   │   │   ├── HeatmapGrid.tsx
│   │   │   ├── RewardStrip.tsx
│   │   │   ├── SegmentCard.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ToastContainer.tsx
│   │   │   └── ui/
│   │   │       ├── badge/
│   │   │       │   ├── Badge.tsx
│   │   │       │   └── index.tsx
│   │   │       ├── dialog/
│   │   │       │   ├── Dialog.tsx
│   │   │       │   └── index.tsx
│   │   │       ├── progress/
│   │   │       │   ├── Progress.tsx
│   │   │       │   └── index.tsx
│   │   │       ├── scroll-area/
│   │   │       │   ├── ScrollArea.tsx
│   │   │       │   └── index.tsx
│   │   │       ├── select/
│   │   │       │   ├── Select.tsx
│   │   │       │   └── index.tsx
│   │   │       ├── separator/
│   │   │       │   ├── Separator.tsx
│   │   │       │   └── index.tsx
│   │   │       ├── skeleton/
│   │   │       │   ├── Skeleton.tsx
│   │   │       │   └── index.tsx
│   │   │       ├── slider/
│   │   │       │   ├── Slider.tsx
│   │   │       │   └── index.tsx
│   │   │       ├── sonner/
│   │   │       │   ├── Sonner.tsx
│   │   │       │   └── index.tsx
│   │   │       └── tooltip/
│   │   │           ├── Tooltip.tsx
│   │   │           └── index.tsx
│   │   ├── index.css
│   │   ├── index.tsx
│   │   └── lib/
│   │       ├── api.ts
│   │       ├── mockData.ts
│   │       ├── types.ts
│   │       ├── useAppState.ts
│   │       └── utils.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── openenv.yaml
├── requirements.txt
├── scripts/
│   └── README.md
├── src/
│   ├── __init__.py
│   ├── app.py
│   ├── env.py
│   ├── grader.py
│   ├── models.py
│   ├── reward.py
│   ├── simulator.py
│   ├── tasks.py
│   └── tribe_bridge.py
└── tests/
    ├── __init__.py
    ├── test_Mb.py
    ├── test_calibration.py
    ├── test_grader.py
    ├── test_simulator.py
    └── test_tribe_bridge.py
```