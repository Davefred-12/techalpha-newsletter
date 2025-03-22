import { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import HomePage from "./pages/HomePage/HomePage";
import LoginPopup from "./components/LoginPopup/LoginPopup";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import AdminDashboard from "./pages/AdminDashboard/AdminDashboard";
import PrivateRoute from "./components/PrivateRoute";
import { AuthProvider } from "./AuthContext";
import SendNewsletter from "./pages/SendNewsletter/SendNewsletter";
import EmailTemplate2 from "./pages/EmailTemplate2/EmailTemplate2";
import ThankYouPage from "./pages/ThankYouPage/ThankYouPage";
import EmailTemplate from "./pages/EmailTemplate/EmailTemplate";
import NewsletterAnalyticsDashboard from "./components/NewsletterAnalyticsDashboard/NewsletterAnalyticsDashboard";

const App = () => {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar setShowLogin={setShowLogin} />
          {showLogin && <LoginPopup setShowLogin={setShowLogin} />}

          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/thank-you"
              element={
                <ThankYouPage subscriberName="Valued Esteem Subscriber" />
              }
            />
            <Route path="/send-template2" element={<EmailTemplate2 />} />
            <Route
              path="/admin-dashboard"
              element={
                <PrivateRoute>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/send-newsletter"
              element={
                <PrivateRoute>
                  <SendNewsletter />
                </PrivateRoute>
              }
            />
            <Route
              path="/send-template"
              element={
                <PrivateRoute>
                  <EmailTemplate />
                </PrivateRoute>
              }
            />
            <Route
              path="/analysis-dashboard"
              element={
                <PrivateRoute>
                  <NewsletterAnalyticsDashboard />
                </PrivateRoute>
              }
            />
          </Routes>

          <Footer />
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
          />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
