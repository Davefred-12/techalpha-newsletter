import { useState, useEffect, useRef } from "react";
import "./SendNewsletter.css";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const SendNewsletter = () => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    processing: false,
    currentBatch: 0,
    totalBatches: 0,
  });
  // Keep only the necessary state variables for subscribers
  const [filteredSubscribers, setFilteredSubscribers] = useState([]);
  const [selectedSubscribers, setSelectedSubscribers] = useState([]);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [isFetchingSubscribers, setIsFetchingSubscribers] = useState(false);
  const [newsletterId, setNewsletterId] = useState(null);
  const intervalIdRef = useRef(null); 
  const [searchQuery, setSearchQuery] = useState("");
  const [batchSize, setBatchSize] = useState(50);
  const [waitingForNextBatchConfirmation, setWaitingForNextBatchConfirmation] = useState(false);
  const [allSubscriberBatches, setAllSubscriberBatches] = useState([]);
  const [currentBatchSubscribers, setCurrentBatchSubscribers] = useState([]);
  
  // Simplify pagination state
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [totalSubscribers, setTotalSubscribers] = useState(0);
  const [subscribersPerPage] = useState(1000); 

  
  const API_BASE_URL = "https://techalpha-newsletter-backk.onrender.com/api";

  const getToken = () => {
    const token = localStorage.getItem('adminToken');
    return token || ''; 
  };

  // Fetch all subscribers initially to prepare batches
  useEffect(() => {
    const fetchAllSubscribers = async (page = 1) => {
      setIsFetchingSubscribers(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/subscribers?page=${page}&limit=${subscribersPerPage}`,
          {
            headers: {
              "Authorization": `Bearer ${getToken()}`
            },
            credentials: "include",
          }
        );
        
        if (!response.ok) {
          throw new Error("Failed to fetch all subscribers");
        }
        
        const data = await response.json();
        const allSubs = data.subscribers || [];
        
        // Store total count
        setTotalSubscribers(allSubs.length);
        
        // Prepare batches of subscribers
        const batches = [];
        for (let i = 0; i < allSubs.length; i += batchSize) {
          batches.push(allSubs.slice(i, i + batchSize));
        }
        
        setAllSubscriberBatches(batches);
        
        // Set the first batch as current
        if (batches.length > 0) {
          setCurrentBatchSubscribers(batches[0]);
          setFilteredSubscribers(batches[0]);
        }
        
        // Update progress to have correct totalBatches
        setProgress(prev => ({
          ...prev,
          totalBatches: batches.length
        }));
        
        console.log(`Loaded ${allSubs.length} subscribers in ${batches.length} batches`);
      } catch (error) {
        console.error("Error fetching all subscribers:", error);
        toast.error("Error loading subscribers");
      } finally {
        setIsFetchingSubscribers(false);
      }
    };
    
    fetchAllSubscribers();
  }, [API_BASE_URL, batchSize, subscribersPerPage]);

  // Effect to load subscribers for the current batch
  useEffect(() => {
    // When current batch changes, load those subscribers
    if (allSubscriberBatches.length > 0 && progress.currentBatch < allSubscriberBatches.length) {
      const batchSubscribers = allSubscriberBatches[progress.currentBatch];
      setCurrentBatchSubscribers(batchSubscribers);
      
      // Update filtered subscribers based on search
      if (searchQuery.trim() === "") {
        setFilteredSubscribers(batchSubscribers);
      } else {
        const filtered = batchSubscribers.filter(sub => 
          sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sub.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredSubscribers(filtered);
      }
      
      // Reset selection when loading a new batch
      setSelectedSubscribers([]);
      setIsSelectAll(false);
      
      // Update current batch index for pagination display
      setCurrentBatchIndex(progress.currentBatch);
    }
  }, [progress.currentBatch, allSubscriberBatches, searchQuery]);
  
  // Filter subscribers based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredSubscribers(currentBatchSubscribers);
    } else {
      const filtered = currentBatchSubscribers.filter(sub => 
        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSubscribers(filtered);
    }
  }, [searchQuery, currentBatchSubscribers]);

  // Effect for handling select all on current batch
  useEffect(() => {
    if (isSelectAll) {
      // Add all filtered subscribers from current batch to selectedSubscribers
      const currentBatchIds = filteredSubscribers.map(sub => sub._id);
      setSelectedSubscribers(currentBatchIds);
    }
  }, [isSelectAll, filteredSubscribers]);
  
  // Effect to check if all subscribers in current batch are selected
  useEffect(() => {
    if (filteredSubscribers.length > 0) {
      // Check if all subscribers in current batch are selected
      const allCurrentBatchSelected = filteredSubscribers.every(sub => 
        selectedSubscribers.includes(sub._id)
      );
      
      if (allCurrentBatchSelected !== isSelectAll) {
        setIsSelectAll(allCurrentBatchSelected);
      }
    }
  }, [selectedSubscribers, filteredSubscribers, isSelectAll]);
  
  // Newsletter status monitoring
  useEffect(() => {
    if (newsletterId && progress.processing) {
      console.log(`Setting up monitoring for newsletter ID: ${newsletterId}`);
      
      // Clear any existing interval
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      
      let statusErrorCount = 0; 
      
      const id = setInterval(async () => {
        try {
          console.log(`Checking status for newsletter: ${newsletterId}`);
          const response = await fetch(`${API_BASE_URL}/newsletter/status/${newsletterId}`, {
            headers: {
              "Authorization": `Bearer ${getToken()}`
            },
            credentials: "include",
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch status, status code: ${response.status}`);
          }
          
          const data = await response.json();
          const newsletter = data.newsletter;
          console.log(`Newsletter status: ${newsletter.status}, sent: ${newsletter.sentCount}/${newsletter.totalSubscribers}`);
          
          if (newsletter.status === 'completed' || newsletter.status === 'failed') {
            console.log(`Newsletter process finished with status: ${newsletter.status}`);
            
            clearInterval(id);
            intervalIdRef.current = null;
            
            setLoading(false);
            setProgress(prev => ({
              ...prev,
              current: newsletter.sentCount,
              total: newsletter.totalSubscribers,
              processing: false
            }));
            
            if (newsletter.status === 'completed') {
              if (progress.currentBatch < allSubscriberBatches.length - 1) {
                // There are more batches to process
                // Set waiting for confirmation and prepare next batch
                setWaitingForNextBatchConfirmation(true);
                
                // Make sure next batch is ready to view but not yet processed
                const nextBatchIndex = progress.currentBatch + 1;
                if (nextBatchIndex < allSubscriberBatches.length) {
                  toast.info(`Batch ${progress.currentBatch + 1} completed. Ready for next batch.`);
                }
              } else {
                // All batches completed
                setSuccess(`Newsletter sent successfully to all ${newsletter.sentCount} subscribers!`);
                toast.success(`Newsletter sent successfully to all ${newsletter.sentCount} subscribers!`);
              }
            } else {
              setError(`Error sending newsletter: ${newsletter.error || newsletter.lastError || "Unknown error"}`);
              toast.error("Error sending newsletter");
            }
          } else {
            setProgress(prev => ({
              ...prev,
              current: newsletter.sentCount,
              total: newsletter.totalSubscribers
            }));
          }
        } catch (error) {
          console.error("Error fetching newsletter status:", error);
          
          statusErrorCount++;
          if (statusErrorCount > 3) {
            console.log("Too many status check errors, stopping monitoring");
            clearInterval(id);
            intervalIdRef.current = null;
            setLoading(false);
            setProgress(prev => ({...prev, processing: false}));
            setError("Error monitoring newsletter status. Please check the dashboard for results.");
            toast.error("Error monitoring newsletter status");
          }
        }
      }, 2000);
      
      intervalIdRef.current = id;
      
      return () => {
        console.log("Cleaning up newsletter monitoring");
        if (id) {
          clearInterval(id);
          intervalIdRef.current = null;
        }
      };
    }
  }, [newsletterId, progress.processing, progress.currentBatch, allSubscriberBatches.length, API_BASE_URL]);

  // Toggle select all for current batch
  const handleSelectAll = () => {
    setIsSelectAll(!isSelectAll);
    
    if (!isSelectAll) {
      // Add all subscribers from current batch
      const currentBatchIds = filteredSubscribers.map(sub => sub._id);
      setSelectedSubscribers(currentBatchIds);
    } else {
      // Remove all subscribers
      setSelectedSubscribers([]);
    }
  };
  
  // Toggle individual subscriber selection
  const handleSelectSubscriber = (id) => {
    if (selectedSubscribers.includes(id)) {
      setSelectedSubscribers(selectedSubscribers.filter(subId => subId !== id));
    } else {
      setSelectedSubscribers([...selectedSubscribers, id]);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle batch size change
  const handleBatchSizeChange = (e) => {
    const value = parseInt(e.target.value);
    if (value >= 1 && value <= 100) {
      setBatchSize(value);
    }
  };
  
  // Fetch a specific page/batch of subscribers
  const fetchSubscriberPage = (batchIndex) => {
    if (batchIndex < 0 || 
        batchIndex >= allSubscriberBatches.length || 
        batchIndex === progress.currentBatch || 
        loading || 
        progress.processing) {
      return;
    }
    
    // Update current batch index
    setProgress(prev => ({
      ...prev,
      currentBatch: batchIndex
    }));
    
    // Update currentBatchIndex for pagination display
    setCurrentBatchIndex(batchIndex);
  };

  // Calculate the range of subscribers being displayed
  const getSubscriberRange = () => {
    const start = progress.currentBatch * batchSize + 1;
    const end = Math.min((progress.currentBatch + 1) * batchSize, totalSubscribers);
    return { start, end };
  };

  // Proceed to next batch
  const handleProceedToNextBatch = () => {
    const nextBatchIndex = progress.currentBatch + 1;
    if (nextBatchIndex < allSubscriberBatches.length) {
      // Move to next batch
      setProgress(prev => ({
        ...prev,
        currentBatch: nextBatchIndex,
        current: 0,
        total: 0,
        processing: false
      }));
      
      setCurrentBatchIndex(nextBatchIndex); // Update batch index for display
      setNewsletterId(null);
      setWaitingForNextBatchConfirmation(false);
      
      toast.info(`Loaded batch ${nextBatchIndex + 1} of ${allSubscriberBatches.length}`);
    } else {
      // All batches have been processed
      setSuccess(`All newsletter batches sent successfully!`);
      toast.success(`All newsletter batches sent successfully!`);
      setWaitingForNextBatchConfirmation(false);
    }
  };
  
  // Cancel remaining batches
  const handleCancelRemainingBatches = () => {
    setWaitingForNextBatchConfirmation(false);
    setSuccess(`Newsletter sent partially. Completed ${progress.currentBatch + 1} of ${allSubscriberBatches.length} batches.`);
    toast.info("Remaining batches cancelled");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    
    setProgress(prev => ({ 
      ...prev,
      current: 0, 
      total: 0, 
      processing: true
    }));
    
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    try {
      console.log(`Sending newsletter batch ${progress.currentBatch + 1} of ${allSubscriberBatches.length}`);
      
      const token = getToken();
      if (!token) {
        throw new Error("Authentication token missing. Please log in again.");
      }
      
      // Get subscriber IDs for current batch
      let batchSubscriberIds;
      if (selectedSubscribers.length > 0) {
        // If manual selection is used, use those IDs
        batchSubscriberIds = selectedSubscribers;
      } else if (currentBatchSubscribers.length > 0) {
        // Otherwise, use all subscribers in current batch
        batchSubscriberIds = currentBatchSubscribers.map(sub => sub._id);
      } else {
        throw new Error("No subscribers selected for this batch");
      }
      
      const response = await fetch(`${API_BASE_URL}/newsletter/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        credentials: "include",
        body: JSON.stringify({
          subject,
          message,
          unsubscribeLink: `${window.location.origin}/unsubscribe`,
          subscriberIds: batchSubscriberIds,
          batchSize,
          batchIndex: progress.currentBatch,
          totalBatches: allSubscriberBatches.length
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to send newsletter: ${response.status}`);
      }

      const data = await response.json();
      console.log("Newsletter initiated:", data);
      
      if (!data.newsletterId) {
        throw new Error("No newsletter ID returned from server");
      }
      
      setNewsletterId(data.newsletterId);
      
      setProgress(prev => ({
        ...prev,
        total: data.recipientCount || batchSubscriberIds.length,
        processing: true,
        totalBatches: allSubscriberBatches.length,
      }));
      
    } catch (error) {
      setError(error.message || "Error sending newsletter. Please try again.");
      toast.error(error.message || "Error sending newsletter. Please try again.");
      console.error("Error sending newsletter:", error);
      setProgress(prev => ({ ...prev, processing: false }));
      setLoading(false);
    }
  };

  // Reset form function
  const resetForm = () => {
    if (!loading && !progress.processing) {
      setSubject("");
      setMessage("");
      setSelectedSubscribers([]);
      setIsSelectAll(false);
      setNewsletterId(null);
      setError("");
      setSuccess("");
      setProgress({
        current: 0,
        total: 0,
        processing: false,
        currentBatch: 0,
        totalBatches: 0,
      });
      setWaitingForNextBatchConfirmation(false);
      setCurrentBatchIndex(0); // Reset batch index
    }
  };

  return (
    <div className="send-news">
      <h1 className="news-header">Send Newsletter</h1>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && (
        <div className="alert alert-success">
          {success}
          <button 
            className="btn btn-sm btn-outline-success ms-5" 
            onClick={resetForm}
          >
            Send Another
          </button>
        </div>
      )}

      {/* Next Batch Confirmation Modal */}
      {waitingForNextBatchConfirmation && (
        <div className="batch-confirmation-modal alert alert-info">
          <div className="batch-confirmation-content">
            <h4>Batch {progress.currentBatch + 1} of {allSubscriberBatches.length} Completed!</h4>
            <p>Would you like to proceed to the next batch of subscribers?</p>
            <div className="batch-confirmation-buttons">
              <button 
                className="btnfirst" 
                onClick={handleProceedToNextBatch}
              >
                Yes, Load Next Batch
              </button>
              <button 
                className="btnsecond" 
                onClick={handleCancelRemainingBatches}
              >
                No, Stop Here
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="mb-3">
          <label htmlFor="subject" className="form-label">
            Subject
          </label>
          <input
            type="text"
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="form-control"
            required
            placeholder="Enter newsletter subject"
            disabled={loading || progress.processing || waitingForNextBatchConfirmation}
          />
        </div>

        <div className="mb-3">
          <label htmlFor="message" className="form-label">
            Message
          </label>
          <div className="form-text mb-1">
            You can use {"{name}"} and {"{email}"} as placeholders for personalization.
          </div>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="form-control"
            rows="5"
            required
            placeholder="Enter newsletter message"
            disabled={loading || progress.processing || waitingForNextBatchConfirmation}
          ></textarea>
        </div>
        
        {/* Batch Size Configuration */}
        <div className="mb-3">
          <label htmlFor="batchSize" className="form-label">
            Batch Size (1-100)
          </label>
          <input
            type="number"
            id="batchSize"
            min="1"
            max="100"
            value={batchSize}
            onChange={handleBatchSizeChange}
            className="form-control"
            disabled={loading || progress.processing || waitingForNextBatchConfirmation || allSubscriberBatches.length > 0}
          />
          <div className="form-text">
            Maximum emails to send in each batch. Total batches: {allSubscriberBatches.length || Math.ceil(totalSubscribers / batchSize)}
          </div>
        </div>
        
        {/* Subscriber Selection for Current Batch */}
        <div className="mb-3">
          <label className="form-label">
            Recipients for Batch {currentBatchIndex + 1} of {allSubscriberBatches.length}
          </label>
          <div className="form-text mb-1">
            Select specific subscribers or leave all unselected to send to everyone in this batch.
          </div>
          
          {/* Search bar */}
          <div className="search-container mb-2">
            <input
              type="text"
              className="form-control"
              placeholder="Search subscribers by name or email"
              value={searchQuery}
              onChange={handleSearchChange}
              disabled={loading || progress.processing || isFetchingSubscribers || waitingForNextBatchConfirmation}
            />
          </div>
          
          <div className="subscriber-selection">
            <div className="selection-header">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="selectAll"
                  checked={isSelectAll}
                  onChange={handleSelectAll}
                  disabled={loading || progress.processing || isFetchingSubscribers || waitingForNextBatchConfirmation}
                />
                <label className="form-check-label" htmlFor="selectAll">
                  Select All in This Batch ({filteredSubscribers.length})
                </label>
              </div>
              <div className="selected-count">
                {selectedSubscribers.length} of {currentBatchSubscribers.length} selected
              </div>
            </div>
            
            {/* Display subscriber range info */}
            {totalSubscribers > 0 && (
              <div className="subscriber-range">
                Showing subscribers {getSubscriberRange().start}-
                {getSubscriberRange().end} of {totalSubscribers}
              </div>
            )}
            
            {isFetchingSubscribers ? (
              <div className="text-center p-3">
                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                Loading subscribers...
              </div>
            ) : (
              <div className="subscribers-list">
                {filteredSubscribers.length > 0 ? (
                  filteredSubscribers.map((subscriber) => (
                    <div key={subscriber._id} className="subscriber-item">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`subscriber-${subscriber._id}`}
                          checked={selectedSubscribers.includes(subscriber._id)}
                          onChange={() => handleSelectSubscriber(subscriber._id)}
                          disabled={loading || progress.processing || waitingForNextBatchConfirmation}
                        />
                        <label 
                          className="form-check-label" 
                          htmlFor={`subscriber-${subscriber._id}`}
                        >
                          {subscriber.name} ({subscriber.email})
                        </label>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-3">
                    {searchQuery ? "No subscribers match your search" : "No subscribers found"}
                  </div>
                )}
              </div>
            )}
            
            {/* Batch Navigation */}
            {allSubscriberBatches.length > 1 && (
              <div className="batch-navigation mt-3">
                <div className="batch-pages">
                  <button
                    onClick={() => fetchSubscriberPage(0)}
                    disabled={currentBatchIndex === 0 || loading || progress.processing || waitingForNextBatchConfirmation}
                    className="pagination-btn first-btn"
                  >
                    « First Batch
                  </button>
                  <button
                    onClick={() => fetchSubscriberPage(currentBatchIndex - 1)}
                    disabled={currentBatchIndex === 0 || loading || progress.processing || waitingForNextBatchConfirmation}
                    className="pagination-btn prev-btn"
                  >
                    ‹ Previous Batch
                  </button>

                  <span className="batch-number">
                    Batch {currentBatchIndex + 1} of {allSubscriberBatches.length}
                  </span>

                  <button
                    onClick={() => fetchSubscriberPage(currentBatchIndex + 1)}
                    disabled={currentBatchIndex === allSubscriberBatches.length - 1 || loading || progress.processing || waitingForNextBatchConfirmation}
                    className="pagination-btn next-btn"
                  >
                    Next Batch ›
                  </button>
                  <button
                    onClick={() => fetchSubscriberPage(allSubscriberBatches.length - 1)}
                    disabled={currentBatchIndex === allSubscriberBatches.length - 1 || loading || progress.processing || waitingForNextBatchConfirmation}
                    className="pagination-btn last-btn"
                  >
                    Last Batch »
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        {(loading || progress.processing) && (
          <div className="progress-container">
            <div className="batch-info mb-2">
              <p>Processing batch {progress.currentBatch + 1} of {allSubscriberBatches.length}</p>
            </div>
            <div className="progress">
              <div
                className="progress-bar"
                role="progressbar"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                }}
                aria-valuenow={progress.total > 0 ? (progress.current / progress.total) * 100 : 0}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
              </div>
            </div>
            <p className="text-center">
              Processing: {progress.current} of {progress.total} emails sent
            </p>
          </div>
        )}

        <div className="d-grid gap-2">
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || progress.processing || waitingForNextBatchConfirmation}
          >
            {loading || progress.processing ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Sending Batch {progress.currentBatch + 1}...
              </>
            ) : (
              `Send Batch ${progress.currentBatch + 1} of ${allSubscriberBatches.length || Math.ceil(totalSubscribers / batchSize)}`
            )}
          </button>

          <Link to="/send-template" className="btn btn-secondary">
            Send Special Announcement
          </Link>
        </div>
      </form>
    </div>
  );
};

export default SendNewsletter;