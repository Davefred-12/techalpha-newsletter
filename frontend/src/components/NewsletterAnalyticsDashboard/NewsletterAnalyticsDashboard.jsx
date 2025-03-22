import { useState, useEffect, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Calendar,
  Clock,
  Mail,
  UserCheck,
  Eye,
  RefreshCw,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import "./Dashboard.css";

const NewsletterAnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState({
    subscribers: 0,
    emailsSent: 0,
    emailsDelivered: 0,
    emailsRead: 0,
    newsletterHistory: [],
  });

  const [subscriberDetails, setSubscriberDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNewsletter, setSelectedNewsletter] = useState(null);
  const [showSubscriberModal, setShowSubscriberModal] = useState(false);
  const [filterOption, setFilterOption] = useState("all"); // 'all', 'read', 'unread', 'failed'
  const [resendLoading, setResendLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState({});
  const [resendingNewsletterId, setResendingNewsletterId] = useState(null);
  // New state for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newsletterToDelete, setNewsletterToDelete] = useState(null);

  const API_BASE_URL = "https://techalpha-newsletter-backk.onrender.com/api";

  // Helper function to get auth token
  const getToken = () => {
    const token = localStorage.getItem("adminToken");
    return token || "";
  };

  // Fetch dashboard analytics data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch subscriber count
      const subscribersResponse = await fetch(`${API_BASE_URL}/subscribers`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        credentials: "include",
      });

      if (!subscribersResponse.ok) {
        throw new Error("Failed to fetch subscribers");
      }

      const subscribersData = await subscribersResponse.json();
      const subscriberCount =
        subscribersData.total || subscribersData.subscribers.length;

      // Fetch newsletter analytics
      const newsletterResponse = await fetch(
        `${API_BASE_URL}/newsletter/analytics`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          credentials: "include",
        }
      );

      if (!newsletterResponse.ok) {
        throw new Error("Failed to fetch newsletter analytics");
      }

      const newsletterData = await newsletterResponse.json();

      // Process the data to get totals
      let totalSent = 0;
      let totalDelivered = 0;
      let totalRead = 0;

      // Format the history records with expiration logic
      const formattedHistory = newsletterData.history.map((record) => {
        totalSent += record.sentCount;
        totalDelivered += record.deliveredCount;
        totalRead += record.readCount;

        // Calculate expiration date (30 days from sent date)
        const sentDate = new Date(record.sentDate);
        const expiresAt = new Date(sentDate);
        expiresAt.setDate(expiresAt.getDate() + 30);

        return {
          ...record,
          expiresAt: expiresAt.toISOString().split("T")[0],
        };
      });

      // Set the analytics data
      setAnalyticsData({
        subscribers: subscriberCount,
        emailsSent: totalSent,
        emailsDelivered: totalDelivered,
        emailsRead: totalRead,
        newsletterHistory: formattedHistory,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  // Fetch subscriber details for a specific newsletter
  const fetchNewsletterSubscriberDetails = async (newsletterId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/newsletter/${newsletterId}/recipients`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch recipient details");
      }

      const data = await response.json();
      setSubscriberDetails(data.recipients);
    } catch (error) {
      console.error("Error fetching recipient details:", error);
      toast.error("Failed to load subscriber details");
      setSubscriberDetails([]);
    }
  };

  // Show delete confirmation modal
  const confirmDeleteNewsletter = (newsletter) => {
    setNewsletterToDelete(newsletter);
    setShowDeleteModal(true);
  };

  // Handle delete newsletter with modal confirmation
  const handleDeleteNewsletter = async () => {
    if (!newsletterToDelete) return;
  
    const newsletterId = newsletterToDelete.id;
  
    // Set loading state for this specific newsletter
    setDeleteLoading((prev) => ({ ...prev, [newsletterId]: true }));
  
    try {
      const response = await fetch(
        `${API_BASE_URL}/newsletter/${newsletterId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          credentials: "include",
        }
      );
  
      // Check content type before trying to parse as JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        // Only try to parse JSON if the content type is JSON
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to delete newsletter");
        }
      } else {
        // Handle non-JSON responses (like HTML error pages)
        if (!response.ok) {
          const text = await response.text();
          console.error("Non-JSON error response:", text.substring(0, 100)); // Log the first 100 chars
          throw new Error(
            `Server error: ${response.status} ${response.statusText}`
          );
        }
      }
  
      toast.success("Newsletter record deleted successfully");
  
      // Remove the deleted newsletter from the state
      setAnalyticsData((prev) => ({
        ...prev,
        newsletterHistory: prev.newsletterHistory.filter(
          (item) => item.id !== newsletterId
        ),
      }));
    } catch (error) {
      toast.error(error.message || "Failed to delete newsletter");
      console.error("Error deleting newsletter:", error);
    } finally {
      setDeleteLoading((prev) => ({ ...prev, [newsletterId]: false }));
      setShowDeleteModal(false);
      setNewsletterToDelete(null);
    }
  };

  // Cancel delete operation
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setNewsletterToDelete(null);
  };

  // Handle resending a newsletter
  const handleResendNewsletter = async (
    newsletterId,
    recipientType = "unread"
  ) => {
    if (!newsletterId) return;

    setResendLoading(true);
    setResendingNewsletterId(newsletterId);

    try {
      const response = await fetch(`${API_BASE_URL}/newsletter/resend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        credentials: "include",
        body: JSON.stringify({
          newsletterId: newsletterId,
          recipientType: recipientType, // 'all', 'read', 'unread'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to resend newsletter");
      }

      const data = await response.json();
      toast.success(
        `Newsletter queued for resending to ${data.recipientCount} subscribers`
      );

      // Refresh dashboard data after a short delay
      setTimeout(() => {
        fetchDashboardData();
      }, 2000);
    } catch (error) {
      toast.error(error.message || "Failed to resend newsletter");
      console.error("Error resending newsletter:", error);
    } finally {
      setResendLoading(false);
      setResendingNewsletterId(null);
    }
  };

  // Filter subscriber details based on selected option
  const getFilteredSubscribers = () => {
    if (!subscriberDetails.length) return [];

    switch (filterOption) {
      case "read":
        return subscriberDetails.filter((sub) => sub.status === "read");
      case "unread":
        return subscriberDetails.filter(
          (sub) => sub.status === "delivered" && !sub.readAt
        );
      case "failed":
        return subscriberDetails.filter((sub) => sub.status === "failed");
      default:
        return subscriberDetails;
    }
  };

  // Calculate time remaining for expiration
  const calculateDaysRemaining = (expiresAt) => {
    const expiryDate = new Date(expiresAt);
    const today = new Date();
    const diffTime = expiryDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Handle opening subscriber details modal
  const handleViewSubscribers = (newsletter) => {
    setSelectedNewsletter(newsletter);
    fetchNewsletterSubscriberDetails(newsletter.id);
    setShowSubscriberModal(true);
  };

  // Load data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Create pie chart data
  const deliveryData = [
    {
      name: "Delivered",
      value: analyticsData.emailsDelivered,
      color: "#4ade80",
    },
    {
      name: "Failed",
      value: analyticsData.emailsSent - analyticsData.emailsDelivered,
      color: "#f87171",
    },
  ];

  const readData = [
    {
      name: "Read",
      value: analyticsData.emailsRead,
      color: "#60a5fa",
    },
    {
      name: "Unread",
      value: analyticsData.emailsDelivered - analyticsData.emailsRead,
      color: "#d1d5db",
    },
  ];

  if (loading && !analyticsData.newsletterHistory.length) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Newsletter Analytics Dashboard</h1>

      <div className="dashboard-actions">
        <button
          onClick={fetchDashboardData}
          className="refresh-button"
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
        <Link to="/admin-dashboard" className="back-button">
          Return to Admin Dashboard
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <UserCheck className="stat-icon" />
          <div className="stat-content">
            <p className="stat-label">Total Subscribers</p>
            <p className="stat-value">
              {analyticsData.subscribers.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="stat-card green">
          <Mail className="stat-icon" />
          <div className="stat-content">
            <p className="stat-label">Emails Sent</p>
            <p className="stat-value">
              {analyticsData.emailsSent.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="stat-card purple">
          <Clock className="stat-icon" />
          <div className="stat-content">
            <p className="stat-label">Delivery Rate</p>
            <p className="stat-value">
              {analyticsData.emailsSent > 0
                ? (
                    (analyticsData.emailsDelivered / analyticsData.emailsSent) *
                    100
                  ).toFixed(1)
                : "0"}
              %
            </p>
          </div>
        </div>

        <div className="stat-card amber">
          <Eye className="stat-icon" />
          <div className="stat-content">
            <p className="stat-label">Open Rate</p>
            <p className="stat-value">
              {analyticsData.emailsDelivered > 0
                ? (
                    (analyticsData.emailsRead / analyticsData.emailsDelivered) *
                    100
                  ).toFixed(1)
                : "0"}
              %
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-container">
          <h2 className="chart-title">Delivery Status</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={deliveryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(1)}%`
                }
              >
                {deliveryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value.toLocaleString()} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h2 className="chart-title">Open Rate</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={readData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(1)}%`
                }
              >
                {readData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value.toLocaleString()} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Campaign History Table with Auto-Expiration and Manual Deletion */}
      <div className="table-section">
        <h2 className="table-title">Newsletter History</h2>
        <p className="expiry-notice">
          <Calendar className="calendar-icon" />
          Records automatically expire after 30 days or can be deleted manually
        </p>

        <div className="table-container">
          {analyticsData.newsletterHistory.length === 0 ? (
            <div className="no-data-message">
              <AlertCircle size={24} />
              <p>No newsletter history available</p>
            </div>
          ) : (
            <table className="campaign-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Sent</th>
                  <th>Delivered</th>
                  <th>Read</th>
                  <th>Expires In</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.newsletterHistory.map((record) => (
                  <tr key={record.id}>
                    <td className="newsletter-subject">{record.subject}</td>
                    <td>
                      {new Date(record.sentDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      })}
                    </td>
                    <td>{record.sentCount.toLocaleString()}</td>
                    <td>
                      {record.deliveredCount.toLocaleString()}
                      <span className="percentage green">
                        (
                        {(
                          (record.deliveredCount / record.sentCount) *
                          100
                        ).toFixed(1)}
                        %)
                      </span>
                    </td>
                    <td>
                      {record.readCount.toLocaleString()}
                      <span className="percentage blue">
                        (
                        {(
                          (record.readCount / record.deliveredCount) *
                          100
                        ).toFixed(1)}
                        %)
                      </span>
                    </td>
                    <td>
                      <span
                        className={`expiry-badge ${
                          calculateDaysRemaining(record.expiresAt) < 7
                            ? "red"
                            : "blue"
                        }`}
                      >
                        {calculateDaysRemaining(record.expiresAt)} days
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="view-btn"
                        onClick={() => handleViewSubscribers(record)}
                      >
                        Details
                      </button>
                      <button
                        className={`resend-btn ${
                          resendingNewsletterId === record.id ? "loading" : ""
                        }`}
                        onClick={() =>
                          handleResendNewsletter(record.id, "unread")
                        }
                        disabled={
                          resendLoading || resendingNewsletterId === record.id
                        }
                      >
                        {resendingNewsletterId === record.id
                          ? "Sending..."
                          : "Resend"}
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => confirmDeleteNewsletter(record)}
                        disabled={deleteLoading[record.id]}
                      >
                        {deleteLoading[record.id] ? (
                          <span className="spinner-small"></span>
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Subscriber Details Modal */}
      {showSubscriberModal && selectedNewsletter && (
        <div className="modal-overlay">
          <div className="modal-content subscriber-modal">
            <div className="modal-header">
              <h3>Subscriber Details - {selectedNewsletter.subject}</h3>
              <button
                className="close-btn"
                onClick={() => setShowSubscriberModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="filter-options">
              <button
                className={`filter-btn ${
                  filterOption === "all" ? "active" : ""
                }`}
                onClick={() => setFilterOption("all")}
              >
                All
              </button>
              <button
                className={`filter-btn ${
                  filterOption === "read" ? "active" : ""
                }`}
                onClick={() => setFilterOption("read")}
              >
                Read
              </button>
              <button
                className={`filter-btn ${
                  filterOption === "unread" ? "active" : ""
                }`}
                onClick={() => setFilterOption("unread")}
              >
                Unread
              </button>
              <button
                className={`filter-btn ${
                  filterOption === "failed" ? "active" : ""
                }`}
                onClick={() => setFilterOption("failed")}
              >
                Failed
              </button>
            </div>

            <div className="resend-options">
              <button
                className={`resend-all-btn ${
                  resendingNewsletterId === selectedNewsletter.id
                    ? "loading"
                    : ""
                }`}
                onClick={() =>
                  handleResendNewsletter(selectedNewsletter.id, "all")
                }
                disabled={
                  resendLoading ||
                  resendingNewsletterId === selectedNewsletter.id
                }
              >
                {resendingNewsletterId === selectedNewsletter.id
                  ? "Sending..."
                  : "Resend to All"}
              </button>
              <button
                className={`resend-unread-btn ${
                  resendingNewsletterId === selectedNewsletter.id
                    ? "loading"
                    : ""
                }`}
                onClick={() =>
                  handleResendNewsletter(selectedNewsletter.id, "unread")
                }
                disabled={
                  resendLoading ||
                  resendingNewsletterId === selectedNewsletter.id
                }
              >
                {resendingNewsletterId === selectedNewsletter.id
                  ? "Sending..."
                  : "Resend to Unread"}
              </button>
            </div>

            <div className="subscriber-list-container">
              {subscriberDetails.length === 0 ? (
                <p className="loading-subscribers">
                  Loading subscriber details...
                </p>
              ) : (
                <>
                  <p className="subscriber-count">
                    Showing {getFilteredSubscribers().length} of{" "}
                    {subscriberDetails.length} subscribers
                  </p>
                  <table className="subscriber-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Delivered</th>
                        <th>Read</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredSubscribers().map((subscriber) => (
                        <tr
                          key={subscriber.email}
                          className={`status-${subscriber.status}`}
                        >
                          <td>{subscriber.name}</td>
                          <td>{subscriber.email}</td>
                          <td>
                            <span
                              className={`status-badge ${subscriber.status}`}
                            >
                              {subscriber.status}
                            </span>
                          </td>
                          <td>
                            {subscriber.deliveredAt
                              ? new Date(
                                  subscriber.deliveredAt
                                ).toLocaleString()
                              : "N/A"}
                          </td>
                          <td>
                            {subscriber.readAt
                              ? new Date(subscriber.readAt).toLocaleString()
                              : "Not opened"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && newsletterToDelete && (
        <div className="modal-overlay">
          <div className="modal-content delete-confirm-modal">
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button className="close-btn" onClick={cancelDelete}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this newsletter record?</p>
              <p className="warning-text">
                <AlertCircle size={16} className="warning-icon" />
                This action cannot be undone.
              </p>
              <div className="newsletter-info">
                <strong>Subject:</strong> {newsletterToDelete.subject}
                <br />
                <strong>Sent on:</strong>{" "}
                {new Date(newsletterToDelete.sentDate).toLocaleDateString(
                  "en-GB",
                  {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  }
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={cancelDelete}>
                Cancel
              </button>
              <button
                className="confirm-delete-btn"
                onClick={handleDeleteNewsletter}
                disabled={deleteLoading[newsletterToDelete.id]}
              >
                {deleteLoading[newsletterToDelete.id] ? (
                  <span className="spinner-small"></span>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsletterAnalyticsDashboard;
