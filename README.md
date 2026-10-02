# Mr Sam Driving School 🚗

Official web platform and booking system for **Mr Sam Driving School** (DVSA Grade A Approved Driving Instructor).

## Project Architecture

```
d:\PROJECT\DVLA site\
├── backend/
│   ├── data/
│   │   ├── courses.json        # Driving lesson courses, blocks & pricing
│   │   ├── reviews.json        # Verified pupil passes and testimonials
│   │   └── bookings.json       # Persisted pupil booking submissions
│   ├── routes/
│   │   └── api.js              # REST endpoints for courses, reviews, bookings, stats
│   └── server.js               # Express app, static file server, body parsing
├── frontend/
│   ├── index.html              # Modern, semantic, accessible HTML5 layout
│   ├── css/
│   │   └── style.css           # Premium design system (DVSA green & navy palette)
│   └── js/
│       └── app.js              # Client logic, dynamic API fetch, booking form validation
├── package.json
└── .env.example
```

## Features

- **DVSA Approved Branding**: High trust badges, official DVSA Grade A ADI tags, and pass metrics.
- **Course Packages & Pricing**: Pay-as-you-go, 10h starter blocks, 20h confidence blocks, fast-track intensive courses, and Pass Plus.
- **Online Booking System**: Instant lesson booking enquiry with automatic data storage into `backend/data/bookings.json`.
- **Verified Student Testimonials**: Real pass results with minor fault counts and test centre locations.
- **Coverage Checker**: Postcode tag cloud and driving test centres (Mill Hill, Barnet, Hendon, etc.).
- **Direct WhatsApp & Phone Integration**: Instant direct call and WhatsApp floating action triggers.
- **Mobile-Responsive**: Tailored for both desktop and mobile devices.

## Running the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
# Production mode
npm start

# Development mode (auto-reload on file change)
npm run dev
```

### 3. Open in Browser
Visit [http://localhost:3000](http://localhost:3000)
