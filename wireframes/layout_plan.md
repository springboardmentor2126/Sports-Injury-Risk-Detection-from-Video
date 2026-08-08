# 🎨 Wireframe & UI Layout Plan — Milestone 1

This document defines the visual design system and screen layouts for the Login, Register, and Athlete Profile pages.

---

## 🎨 Design System: "Health & Vitality" Light Theme

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-base` | `#F8FAFC` | Page background (soft off-white) |
| `bg-card` | `#FFFFFF` | Card and panel backgrounds |
| `border` | `#E2E8F0` | Card borders, input borders |
| `text-primary` | `#0F172A` | Headings and body text |
| `text-secondary`| `#64748B` | Labels, placeholder, captions |
| `accent-teal` | `#0D9488` | Primary buttons, success states, health indicator |
| `accent-blue` | `#2563EB` | Links, data/metric highlights |
| `error` | `#EF4444` | Validation errors |
| `warning` | `#F59E0B` | Risk warnings |

### Typography
| Style | Font | Size | Weight |
|-------|------|------|--------|
| Page Heading | Inter | 28px | 700 |
| Card Heading | Inter | 20px | 600 |
| Body | Inter | 14px | 400 |
| Label | Inter | 12px | 500 |
| Button | Inter | 14px | 600 |

### Component Tokens
- **Border radius**: `12px` for cards, `8px` for inputs and buttons
- **Card shadow**: `0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)`
- **Hover lift**: `transform: translateY(-2px)` + slightly deeper shadow
- **Transition**: `all 200ms ease-in-out` on interactive elements

---

## 🖥️ Screen 1: Login Page (`/auth/login`)

### Layout
```
┌──────────────────────────────────────────┐
│  bg: #F8FAFC (full screen)               │
│                                          │
│    ┌──────────────────────────────┐      │
│    │  🏃 Sports Injury Detection  │      │
│    │  (logo + tagline)            │      │
│    │                              │      │
│    │  Email Address               │      │
│    │  [─────────────────────────] │      │
│    │                              │      │
│    │  Password                    │      │
│    │  [─────────────────────────] │      │
│    │                              │      │
│    │  [  Sign In  ] (teal btn)    │      │
│    │                              │      │
│    │  Don't have an account?      │      │
│    │  → Register here             │      │
│    └──────────────────────────────┘      │
│       (white card, centered)             │
└──────────────────────────────────────────┘
```

---

## 🖥️ Screen 2: Register Page (`/auth/register`)

### Layout
```
┌──────────────────────────────────────────┐
│  bg: #F8FAFC                             │
│                                          │
│    ┌──────────────────────────────┐      │
│    │  Create Your Account         │      │
│    │                              │      │
│    │  First Name   | Last Name    │      │
│    │  [──────────] | [──────────] │      │
│    │                              │      │
│    │  Email Address               │      │
│    │  [─────────────────────────] │      │
│    │                              │      │
│    │  Password                    │      │
│    │  [─────────────────────────] │      │
│    │                              │      │
│    │  I am a... (role selector)   │      │
│    │  ┌────────┐ ┌────────┐       │      │
│    │  │🏃Athlete│ │🤝Coach │       │      │
│    │  └────────┘ └────────┘       │      │
│    │  ┌──────────┐ ┌──────────┐   │      │
│    │  │💊 Physio │ │🔬Scientist│   │      │
│    │  └──────────┘ └──────────┘   │      │
│    │                              │      │
│    │  [ Create Account ] (teal)   │      │
│    └──────────────────────────────┘      │
└──────────────────────────────────────────┘
```
**Key detail**: The role selector uses **large icon cards** instead of a dropdown to make the selection feel interactive and visual.

---

## 🖥️ Screen 3: Athlete Profile Setup Wizard (`/athlete/setup`)

This is a **multi-step wizard** shown immediately after an Athlete registers for the first time.

### Step Indicator
```
● Step 1 ──── ○ Step 2 ──── ○ Step 3
Personal      Sport         Injury History
```

### Step 1: Personal Details
```
┌──────────────────────────────────────────┐
│  Tell us about yourself                  │
│                                          │
│  Age           Height (cm)  Weight (kg)  │
│  [──────────]  [──────────] [──────────] │
│                                          │
│  Gender (optional)                       │
│  ○ Male  ○ Female  ○ Other               │
│                                          │
│  Dominant Limb (optional)                │
│  ○ Right  ○ Left                         │
│                                          │
│          [ Next → ]                      │
└──────────────────────────────────────────┘
```

### Step 2: Sports Details
```
┌──────────────────────────────────────────┐
│  Your sport & training                   │
│                                          │
│  Sport Type                              │
│  [Select sport ▼]                        │
│                                          │
│  Playing Position (optional)             │
│  [──────────────────────────]            │
│                                          │
│  Weekly Training Hours                   │
│  [──────────────────────────]            │
│                                          │
│  [ ← Back ]          [ Next → ]          │
└──────────────────────────────────────────┘
```

### Step 3: Injury History
```
┌──────────────────────────────────────────┐
│  Any past injuries?                      │
│  (You can skip this step)                │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ Injury Name: ACL Tear            │   │
│  │ Body Part: Left Knee             │   │
│  │ Date: 2024-03-15                 │   │
│  │ Recovery: 12 weeks               │   │
│  └──────────────────────────────────┘   │
│                                          │
│  [ + Add Another Injury ]               │
│                                          │
│  [ ← Back ]    [ Finish Setup ✓ ]       │
└──────────────────────────────────────────┘
```

---

## ✅ UI Component Checklist (to be built in Next.js)

- [ ] `Button` component (primary teal, outlined, ghost variants)
- [ ] `Input` component (with label, error message slot)
- [ ] `RoleCard` component (icon + label selector card)
- [ ] `StepIndicator` component (wizard progress dots)
- [ ] `InjuryCard` component (injury history list item)
- [ ] `Navbar` component (app header with user info)
