/* eslint-disable react/prop-types */
import { useState, useContext } from "react";
import { FaRegEye, FaRegEyeSlash, FaUserTie } from "react-icons/fa";
import { MdOutlineEmail } from "react-icons/md";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import "./LoginPopup.css";
import { AuthContext } from "../../AuthContext";

const LoginPopup = ({ setShowLogin }) => {
  const [currState, setCurrState] = useState("Login");
  const [showPassword, setShowPassword] = useState(false);
  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const onChangeHandler = (event) => {
    const { name, value } = event.target;
    setData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        "https://techalpha-newsletter-backk.onrender.com/api/admin-login",
        {
          username: data.email,
          password: data.password,
        },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data?.token) {
        login(response.data.token);
        toast.success(`Welcome back, ${response.data.name}!`); // Use the name from response
        setShowLogin(false);
        navigate("/send-newsletter");
      } else {
        toast.error("No token received. Please try again.");
      }
    } catch (error) {
      console.error("Login Error:", error.response?.data || error.message);
      toast.error(
        error.response?.data?.message ||
          "Login failed. Please check your credentials."
      );
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        "https://techalpha-newsletter-backk.onrender.com/api/admin-signup",
        {
          name: data.name,
          email: data.email,
          password: data.password,
        },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 201) {
        toast.success("Registration successful!");
        // Clear the form data
        setData({
          name: "",
          email: "",
          password: "",
        });
        setCurrState("Login"); // Switch to login form after successful signup
      }
    } catch (error) {
      if (error.message === "Network Error") {
        toast.error("Connection failed. This may be a CORS issue.");
        console.error("Possible CORS error:", error);
      } else {
        toast.error(
          error.response?.data?.message || "Signup failed. Please try again."
        );
        console.error("Signup Error:", error.response?.data || error.message);
      }
    }
  };

  const handleSubmit = (e) => {
    if (currState === "Login") {
      handleLogin(e);
    } else {
      handleSignup(e);
    }
  };

  return (
    <div className="login-popup">
      <form onSubmit={handleSubmit} className="login-popup-container">
        <div className="login-popup-title">
          <h2>{currState}</h2>
          <button type="button" onClick={() => setShowLogin(false)}>
            Close
          </button>
        </div>
        <div className="login-popup-inputs">
          {currState === "Sign Up" && (
            <div className="input-with-icon">
              <FaUserTie className="input-icon" />
              <input
                name="name"
                onChange={onChangeHandler}
                value={data.name}
                type="text"
                placeholder="Your Name"
                required
              />
            </div>
          )}
          <div className="input-with-icon">
            <MdOutlineEmail className="input-icon" />
            <input
              name="email"
              onChange={onChangeHandler}
              value={data.email}
              type="email"
              placeholder="Your Email"
              required
            />
          </div>
          <div className="password-container input-with-icon">
            <input
              name="password"
              onChange={onChangeHandler}
              value={data.password}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              required
            />
            <span
              onClick={togglePasswordVisibility}
              className="password-toggle-icon"
            >
              {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
            </span>
          </div>
        </div>
        <button type="submit">
          {currState === "Sign Up" ? "Create Account" : "Login"}
        </button>
        <div className="login-popup-condition">
          <input type="checkbox" required />
          <p>
            By continuing, I agree to the <a href="/terms">Terms of use</a>.
          </p>
        </div>
        {currState === "Login" ? (
          <p>
            Don&apos;t have an account?{" "}
            <span onClick={() => setCurrState("Sign Up")}>Sign Up</span>
          </p>
        ) : (
          <p>
            Already have an account?{" "}
            <span onClick={() => setCurrState("Login")}>Login</span>
          </p>
        )}
      </form>
    </div>
  );
};

export default LoginPopup;
