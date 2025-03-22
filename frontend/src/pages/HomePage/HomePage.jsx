import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./HomePage.css";
import LoginPopup from "../../components/LoginPopup/LoginPopup";

const HomePage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      const response = await fetch("http://localhost:9000/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        }),
      });

      if (response.ok) {
        toast.success("Thank you for subscribing!");
        navigate("/thank-you");
      } else {
        const errorData = await response.json();
        toast.error(
          errorData.message || "Subscription failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred. Please try again.");
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="page-container">
      {showLogin && <LoginPopup setShowLogin={setShowLogin} />}

      <main className="main-content">
        <div className="subscription-box">
          <h1>Subscribe to Our Newsletter</h1>
          <p className="subtitle">
            Stay updated with the latest news and exclusive offers.
          </p>
          <form onSubmit={handleSubmit} className="subscription-form">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your name"
            />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="Enter your phone number"
            />
            <button type="submit">Subscribe</button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
