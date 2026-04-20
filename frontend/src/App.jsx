import { useEffect } from "react";
import Routes from './pages/Routes.jsx'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export default function App() {
    useEffect(() => {
        console.log("🚀 App mounted. Setting up inactivity timer...");
        const INACTIVITY_LIMIT = 7 * 60 * 1000; // 7 minutes

        const resetTimer = () => {
            localStorage.setItem("lastActivity", Date.now().toString());
        };

        const checkInactivity = () => {
            const lastActivity = localStorage.getItem("lastActivity");

            if (!lastActivity) return;

            const timeElapsed = Date.now() - parseInt(lastActivity, 10);

            if (timeElapsed > INACTIVITY_LIMIT) {
                console.log("⏳ User inactive. Clearing session...");

                localStorage.clear(); // or remove specific keys
                window.location.href = "/"; // redirect to login
            }
        };

        // Set initial activity time on load
        resetTimer();

        // Activity listeners
        window.addEventListener("mousemove", resetTimer);
        window.addEventListener("keydown", resetTimer);
        window.addEventListener("click", resetTimer);
        window.addEventListener("scroll", resetTimer);

        // Check every minute
        const interval = setInterval(checkInactivity, 1000);

        return () => {
            window.removeEventListener("mousemove", resetTimer);
            window.removeEventListener("keydown", resetTimer);
            window.removeEventListener("click", resetTimer);
            window.removeEventListener("scroll", resetTimer);
            clearInterval(interval);
        };
    }, []);

    return (
        <>
            <Routes />
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />
        </>
    )
}