# 🚀 WordRush

### AI-Integrated Full-Stack Web Application

WordRush is a full-stack AI-powered web application designed to make vocabulary learning more interactive and engaging. The platform combines AI-generated content, secure authentication, persistent user data, performance tracking, and competitive leaderboard functionality.

Built with a **React 19 frontend** and **Python FastAPI backend**, WordRush integrates the **OpenRouter API** with primary/fallback model routing to provide reliable AI-powered content generation.

---

## ✨ Features

- 🤖 **AI-Powered Content Generation**
  - Generates dynamic learning content using large language models through OpenRouter.

- 🔄 **AI Model Fallback Routing**
  - Implements primary and fallback model routing to improve reliability when the primary AI model is unavailable.

- ⚡ **FastAPI REST API**
  - Provides structured RESTful endpoints for authentication, AI generation, application logic, and user data.

- ⚛️ **React 19 Frontend**
  - Modern component-based frontend with five interactive application modules.

- 🔐 **Secure Authentication**
  - JWT-based authentication
  - bcrypt password hashing
  - Google OAuth integration

- 🗄️ **MongoDB Data Layer**
  - Stores user profiles, activity, statistics, and application data.

- 📊 **User Statistics**
  - Tracks user performance and learning activity.

- 🏆 **Leaderboard**
  - Provides competitive rankings based on user performance and activity.

- 🧪 **Automated Testing**
  - Backend testing with `pytest`
  - End-to-end testing with `Playwright`

---

## 🏗️ Architecture

```text
                    ┌──────────────────────┐
                    │   React 19 Frontend  │
                    │                      │
                    │  Interactive Modules │
                    └──────────┬───────────┘
                               │
                               │ REST API
                               ▼
                    ┌──────────────────────┐
                    │    FastAPI Backend   │
                    │                      │
                    │ Authentication       │
                    │ Business Logic      │
                    │ AI Integration      │
                    │ API Endpoints       │
                    └───────┬───────┬──────┘
                            │       │
                  ┌─────────┘       └──────────┐
                  ▼                            ▼
        ┌──────────────────┐        ┌──────────────────┐
        │     MongoDB      │        │  OpenRouter API  │
        │                  │        │                  │
        │ Users            │        │ Primary Model    │
        │ Statistics       │        │       ↓          │
        │ Leaderboard      │        │ Fallback Model   │
        └──────────────────┘        └──────────────────┘
````

---

## 🔐 Authentication

WordRush implements multiple authentication mechanisms:

* JWT authentication for API authorization
* bcrypt for secure password hashing
* Google OAuth for third-party authentication
* Protected application routes
* Persistent user sessions

---

## 🤖 AI Integration

The application uses the **OpenRouter API** to provide access to large language models for dynamic content generation.

To improve reliability, WordRush implements a fallback strategy:

```text
User Request
     │
     ▼
Primary AI Model
     │
     ├── Success ──────► Return Response
     │
     └── Failure
            │
            ▼
      Fallback Model
            │
            ▼
      Return Response
```

This approach helps prevent a single model or provider failure from interrupting the user experience.

---

## 🧪 Testing

WordRush includes automated testing across the backend and frontend.

### Backend

**pytest** is used to test:

* REST API behavior
* Authentication
* Backend logic
* API integrations
* Error handling

### End-to-End

**Playwright** is used to validate:

* User workflows
* Authentication flows
* Application interactions
* Frontend-to-backend integration
* Critical user journeys

---

## 🛠️ Tech Stack

| Category       | Technologies                         |
| -------------- | ------------------------------------ |
| Frontend       | React 19                             |
| Backend        | Python, FastAPI                      |
| AI             | OpenRouter API, LLMs                 |
| Database       | MongoDB                              |
| Authentication | JWT, bcrypt, Google OAuth            |
| Testing        | pytest, Playwright                   |
| Architecture   | REST API, Full-Stack Web Application |

---

## 📂 Project Structure

```text
WordRush/
├── frontend/          # React 19 application
├── backend/           # FastAPI application
├── tests/              # Automated tests
├── requirements.txt    # Python dependencies
├── package.json        # Frontend dependencies
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Samkwibe/WordRush.git
cd WordRush
```

### 2. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 3. Install frontend dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file and add the required configuration:

```env
OPENROUTER_API_KEY=your_api_key
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 5. Start the application

Start the FastAPI backend and React frontend using the project's development commands.

---

## 🧪 Running Tests

Run backend tests:

```bash
pytest
```

Run end-to-end tests:

```bash
npx playwright test
```

---

## 🎯 Engineering Highlights

WordRush demonstrates experience with:

* Full-stack application development
* RESTful API architecture
* AI/LLM integration
* Fault-tolerant API design
* Authentication and authorization
* OAuth integration
* NoSQL database design
* Automated testing
* End-to-end testing
* Modern React development
* Backend development with Python/FastAPI

---

## 👨‍💻 Author

**Samuel Raymond Kwibe**

Computer Science | Software Engineering | AI | Cloud Engineering

* GitHub: [@Samkwibe](https://github.com/Samkwibe)
* LinkedIn: [Samuel Kwibe](https://www.linkedin.com/in/samuel-kwibe-371633249/)

---

## 📄 License

This project is available for educational and portfolio purposes.
