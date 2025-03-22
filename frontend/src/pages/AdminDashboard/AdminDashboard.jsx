import { useState, useEffect } from "react";
import "./AdminDashboard.css";
import { toast } from "react-toastify";
import Modal from "../../components/Modal/Modal";
import { Link } from "react-router-dom"; // Import Link from react-router-dom

const AdminDashboard = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [newSubscriber, setNewSubscriber] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedSubscribers, setSelectedSubscribers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState(null);

  // Pagination state - changed to 20 subscribers per page
  const [currentPage, setCurrentPage] = useState(1);
  const [subscribersPerPage] = useState(20); // Changed from 50 to 20
  const [totalPages, setTotalPages] = useState(1);
  const [totalSubscribers, setTotalSubscribers] = useState(0);

  const API_BASE_URL = "http://localhost:9000/api";

  useEffect(() => {
    fetchSubscribers(1); // Start with page 1
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSubscribers = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/subscribers?page=${page}&limit=${subscribersPerPage}`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch subscribers");
      }

      setSubscribers(data.subscribers);
      setTotalPages(
        data.totalPages || Math.ceil(data.total / subscribersPerPage)
      );
      setTotalSubscribers(data.total);
      setCurrentPage(page);

      // Reset selected subscribers when page changes
      setSelectedSubscribers([]);
    } catch (error) {
      setError("Error fetching subscribers. Please try again.");
      toast.error("Failed to load subscribers");
      console.error("Error fetching subscribers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (email) => {
    setEmailToDelete(email); // Set the email to delete
    setIsModalOpen(true); // Open the modal
  };

  const confirmDelete = async () => {
    setIsModalOpen(false); // Close the modal
    try {
      const response = await fetch(`${API_BASE_URL}/subscribers/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: emailToDelete }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete subscriber");
      }

      toast.success("Subscriber deleted successfully!");
      fetchSubscribers(currentPage);
    } catch (error) {
      toast.error("Error deleting subscriber. Please try again.");
      console.error("Error deleting subscriber:", error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedSubscribers.length === 0) {
      toast.warn("No subscribers selected for deletion.");
      return;
    }

    setIsModalOpen(true);
  };

  const confirmDeleteSelected = async () => {
    setIsModalOpen(false);
    try {
      const response = await fetch(
        `${API_BASE_URL}/subscribers/delete-multiple`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ emails: selectedSubscribers }),
        }
      );

      // Log the response for debugging
      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete subscribers");
      }

      toast.success("Selected subscribers deleted successfully!");
      setSelectedSubscribers([]);
      fetchSubscribers(currentPage);
    } catch (error) {
      toast.error("Error deleting selected subscribers. Please try again.");
      console.error("Error deleting selected subscribers:", error);
    }
  };

  const handleCheckboxChange = (email) => {
    if (selectedSubscribers.includes(email)) {
      setSelectedSubscribers(selectedSubscribers.filter((e) => e !== email));
    } else {
      setSelectedSubscribers([...selectedSubscribers, email]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedSubscribers(subscribers.map((subscriber) => subscriber.email));
    } else {
      setSelectedSubscribers([]);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/subscribers/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newSubscriber),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add subscriber");
      }

      setSuccess("Subscriber added successfully!");
      toast.success("Subscriber added successfully!");
      setNewSubscriber({ name: "", email: "", phone: "" });
      fetchSubscribers(currentPage);
    } catch (error) {
      const errorMessage =
        error.message || "Error adding subscriber. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error adding subscriber:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setError("");
    setSuccess("");

    const validTypes = [
      "application/vnd.ms-excel",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!validTypes.includes(uploadedFile.type)) {
      setError("Invalid file type. Please upload a CSV or Excel file.");
      toast.error("Invalid file type");
      return;
    }

    if (uploadedFile.size > 5 * 1024 * 1024) {
      setError("File size too large. Please upload a file smaller than 5MB.");
      toast.error("File too large");
      return;
    }

    const formData = new FormData();
    formData.append("file", uploadedFile);

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/subscribers/import`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import subscribers");
      }

      setSuccess("File imported successfully!");
      toast.success("Subscribers imported successfully!");
      fetchSubscribers(1); // Go back to page 1 after import
    } catch (error) {
      const errorMessage = error.message || "Error importing subscribers";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error importing subscribers:", error);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/subscribers/export/${format}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to export as ${format}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subscribers.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(`Error exporting as ${format}`);
      console.error(`Error exporting as ${format}:`, error);
    }
  };

  // Calculate the range of subscribers being displayed
  const getSubscriberRange = () => {
    const start = (currentPage - 1) * subscribersPerPage + 1;
    const end = Math.min(currentPage * subscribersPerPage, totalSubscribers);
    return { start, end };
  };

  return (
    <div className="dashboard-content">
      <h1>Admin Dashboard</h1>

      <h3>Subscriber Management</h3>

      {loading && <p>Loading...</p>}
      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}

      {/* Subscriber List */}
      <div className="subscriber-table">
        <div className="dashboard-actions">
          <button className="total-subscribers-btn">
            Total Subscribers: {totalSubscribers || subscribers.length}
          </button>
          <Link to="/analysis-dashboard" className="analytics-button">
            View Newsletter Analytics
          </Link>
          <button
            className="delete-selected-btn"
            onClick={handleDeleteSelected}
            disabled={selectedSubscribers.length === 0}
          >
            Delete Selected
          </button>
        </div>

        {/* Display subscriber range */}
        {totalSubscribers > 0 && (
          <div className="subscriber-range">
            Showing subscribers {getSubscriberRange().start}-
            {getSubscriberRange().end} of {totalSubscribers}
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Action</th>
              <th>
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={
                    subscribers.length > 0 &&
                    selectedSubscribers.length === subscribers.length
                  }
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((subscriber, index) => (
              <tr key={subscriber.email}>
                <td>{(currentPage - 1) * subscribersPerPage + index + 1}</td>
                <td>{subscriber.name}</td>
                <td>{subscriber.email}</td>
                <td>{subscriber.phone}</td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(subscriber.email)}
                  >
                    Delete
                  </button>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedSubscribers.includes(subscriber.email)}
                    onChange={() => handleCheckboxChange(subscriber.email)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Enhanced Pagination Controls with Page Numbers */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => fetchSubscribers(1)}
              disabled={currentPage === 1 || loading}
              className="pagination-btn first-btn"
            >
              « First
            </button>
            <button
              onClick={() => fetchSubscribers(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="pagination-btn prev-btn"
            >
              ‹ Previous
            </button>

            <div className="page-numbers">
              {/* Display page numbers */}
              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;

                // Show current page and some pages before and after
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= currentPage - 2 &&
                    pageNumber <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => fetchSubscribers(pageNumber)}
                      className={`page-number ${
                        currentPage === pageNumber ? "active" : ""
                      }`}
                      disabled={loading}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (
                  pageNumber === currentPage - 3 ||
                  pageNumber === currentPage + 3
                ) {
                  // Show ellipsis
                  return (
                    <span key={pageNumber} className="ellipsis">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <button
              onClick={() => fetchSubscribers(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
              className="pagination-btn next-btn"
            >
              Next ›
            </button>
            <button
              onClick={() => fetchSubscribers(totalPages)}
              disabled={currentPage === totalPages || loading}
              className="pagination-btn last-btn"
            >
              Last »
            </button>

            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>

      {/* Add Subscriber Form */}
      <div className="add-subscriber-section">
        <h3 className="add-header">Add Subscriber</h3>
        <form onSubmit={handleAdd}>
          <input
            type="text"
            placeholder="Enter name"
            value={newSubscriber.name}
            onChange={(e) =>
              setNewSubscriber({ ...newSubscriber, name: e.target.value })
            }
            required
          />
          <input
            type="email"
            placeholder="Enter email"
            value={newSubscriber.email}
            onChange={(e) =>
              setNewSubscriber({ ...newSubscriber, email: e.target.value })
            }
            required
          />
          <input
            type="text"
            placeholder="Enter phone number"
            value={newSubscriber.phone}
            onChange={(e) =>
              setNewSubscriber({ ...newSubscriber, phone: e.target.value })
            }
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Subscriber"}
          </button>
        </form>
      </div>

      {/* Import Section */}
      <div className="import-section">
        <h3 className="import-header">Import Subscribers</h3>
        <div className="import-form mt-4">
          <div className="mb-3">
            <label htmlFor="file" className="form-label">
              Upload Excel or CSV File
            </label>
            <input
              type="file"
              id="file"
              name="file"
              className="form-control"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
            />
          </div>
          {error && <p className="error-message">{error}</p>}
        </div>
      </div>

      {/* Export Section */}
      <h3 className="export-header">Export Subscribers</h3>
      <div className="row export-buttons">
        <div className="col-sm-4 p-3">
          <button
            onClick={() => handleExport("xlsx")}
            className="btn btn-success export-btn"
          >
            Export as Excel
          </button>
        </div>
        <div className="col-sm-4 p-3">
          <button
            onClick={() => handleExport("csv")}
            className="btn btn-info export-btn"
          >
            Export as CSV
          </button>
        </div>
        <div className="col-sm-4 p-3">
          <button
            onClick={() => handleExport("pdf")}
            className="btn btn-danger export-btn"
          >
            Export as PDF
          </button>
        </div>
      </div>

      {/* Modal for Delete Confirmation */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={emailToDelete ? confirmDelete : confirmDeleteSelected}
        message={
          emailToDelete
            ? "Are you sure you want to delete this subscriber?"
            : "Are you sure you want to delete the selected subscribers?"
        }
      />
    </div>
  );
};

export default AdminDashboard;
