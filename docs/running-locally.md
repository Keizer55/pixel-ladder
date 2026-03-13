# Running the Website Locally

This guide provides step-by-step instructions on how to set up and run the Pixel Ladder website on your local machine for development and testing.

## Prerequisites

Before you begin, ensure you have the following installed on your system:
- **Git** (to clone the repository)
- **Node.js** (version 18 or higher recommended)
- **npm** (comes installed automatically with Node.js)

You can verify your Node and npm installations by opening a terminal and running:
```bash
node -v
npm -v
```

## Setup Instructions

1. **Clone the repository** (if you haven't already):
   Open your terminal and run:
   ```bash
   git clone <repository-url>
   ```

2. **Navigate to the project directory**:
   ```bash
   cd pixel-ladder
   ```

3. **Install dependencies**:
   You need to install the project dependencies before running the app for the first time. Run the following command:
   ```bash
   npm install
   ```

## Running the Development Server

1. Once dependencies are installed, start the local development server:
   ```bash
   npm run dev
   ```

2. The terminal will display a message indicating that the server is running (typically on port 3000 or the next available port).

3. **Open your web browser** and navigate to the URL provided in your terminal, for example:
   [http://localhost:3000](http://localhost:3000)

Your local version of the website should now be visible! The development server includes hot-reloading, meaning that any changes you make to the code will automatically refresh the page in your browser.

## Stopping the Server

To stop the local development server when you are finished testing, go to the terminal where the server is running and press:
`Ctrl + C` (You may be prompted to terminate the batch job, press `Y` and `Enter`).
