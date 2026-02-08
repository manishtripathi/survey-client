import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

function UserDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [redeemPoints, setRedeemPoints] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [notification, setNotification] = useState(null); // State for notification
  const [notificationType, setNotificationType] = useState("info"); // State for notification type

  const dropdownRef = useRef(null);

  // ✅ fetchProfile MUST be outside useEffect
  const fetchProfile = async () => {
    try {
      const res = await api.get("/auth/profile");
      setUser(res.data.user);
    } catch (err) {
      console.error("Profile fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  // Load profile on mount
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProfile(); // auto refresh
    }, 5000); // every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch assigned surveys
  useEffect(() => {
    const fetchAssignedSurveys = async () => {
      try {
        const res = await api.get("/surveys/assigned", {
          params: { userId: user?._id },
        });
        setSurveys(res.data.surveys || []);
      } catch (err) {
        console.error("Failed to fetch surveys", err);
        setErrorMessage("Failed to fetch assigned surveys");
      }
    };

    if (user) {
      fetchAssignedSurveys();
    }
  }, [user]);

  // Debugging: Log surveys data to verify assignmentStatus
  useEffect(() => {
    console.log("Surveys Data:", surveys);
  }, [surveys]);

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // ✅ Redeem handler (FIXED)
  const handleRedeem = async () => {
    if (!user) {
      setNotification("User not found. Please log in again."); // Notify user
      setNotificationType("error"); // Set notification type to error
      return;
    }

    if ((user?.points ?? 0) < 50) {
      setNotification("You need at least 50 points"); // Set notification
      setNotificationType("warning"); // Set notification type to warning
      return;
    }

    if (Number(redeemPoints) < 50) {
      setNotification("Minimum redeem amount is 50"); // Set notification
      setNotificationType("warning"); // Set notification type to warning
      return;
    }

    try {
      const res = await api.post("/redemption/request", {
        points: Number(redeemPoints),
      });

      setNotification(res.data.message); // Set success notification
      setNotificationType("success"); // Set notification type to success
      setRedeemPoints("");
      fetchProfile(); // refresh points
    } catch (err) {
      console.error("Redeem request failed", err); // Log error for debugging
      setNotification(err.response?.data?.message || "Redeem failed"); // Set error notification
      setNotificationType("error"); // Set notification type to error
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  //fetach Completed Survey
  const [completedSurveys, setCompletedSurveys] = useState([]);
  useEffect(() => {
  const fetchCompletedSurveys = async () => {
    try {
      const res = await api.get("/surveys/completed");
      setCompletedSurveys(res.data.surveys || []);
    } catch (err) {
      console.error("Failed to fetch completed surveys", err);
    }
  };

  fetchCompletedSurveys();
}, []);

  // State for redemption requests
  const [redemptionRequests, setRedemptionRequests] = useState([]);

  // Fetch redemption requests
  useEffect(() => {
    const fetchRedemptionRequests = async () => {
      try {
        const res = await api.get("/redemption/requests"); // Corrected endpoint
        setRedemptionRequests(res.data.requests || []);
        // Log the API response inside the try block
        console.log("Redemption Requests API Response:", res.data);
      } catch (err) {
        console.error("Failed to fetch redemption requests", err);
      }
    };

    fetchRedemptionRequests();
    //console.log("Redemption Requests API Response:", res.data); // Moved inside the try block
  }, []);

  // Add real-time updates for quick actions
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProfile(); // Refresh user profile data
      const fetchRedemptionRequests = async () => {
        try {
          const res = await api.get("/redemption/requests");
          setRedemptionRequests(res.data.requests || []);
        } catch (err) {
          console.error("Failed to fetch redemption requests", err);
        }
      };
      fetchRedemptionRequests();
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Separate pending and approved requests
  const pendingRequests = redemptionRequests.filter(
    (request) => request.status === "pending"
  );
  const approvedRequests = redemptionRequests.filter(
    (request) => request.status === "approved"
  );

  // Filter surveys to show only those with rewarded status
  const filteredSurveys = surveys.filter(
    (survey) => survey.assignmentStatus === "rewarded"
  );

  // Calculate total earned points
  const totalEarnedPoints = filteredSurveys.reduce(
    (sum, survey) => sum + (survey.rewardPoints || 0),
    0
  );

  // Log survey names and statuses
  useEffect(() => {
    if (filteredSurveys.length > 0) {
      console.log("Assigned Surveys:");
      filteredSurveys.forEach((survey) => {
        console.log(`Survey Name: ${survey.title}, Status: ${survey.status}`);
      });
    }
  }, [filteredSurveys]);

  // Clear notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header at the top */}
      <header className="bg-white px-6  py-2 border-b border-gray-300 fixed top-0 left-0 w-full z-10">
        <div className="flex justify-between items-center">
          <img
            src="https://raw.githubusercontent.com/kphotone-research/Images-kphotone/main/Logo.png"
            alt="Logo"
            style={{ width: 150, height: 50 }}
          />
          <div className="flex items-center relative">
            <span className="text-sm/6 text-gray-950  mr-4 capitalize">
              {user?.email?.split("@")[0]}
            </span>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-400 px-1 py-1 rounded text-[12px]"
            >
              ▼
            </button>
            {showDropdown && (
              <div
                ref={dropdownRef}
                className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded shadow-md"
                style={{ top: "100%" }}
              >
                <div className="px-4 py-2 text-gray-700">{user?.email}</div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content with left-side menu */}
      <div className="flex flex-1 mt-16">
        {/* Left-side menu */}
        <main className="flex-1 p-6">
          {/* Notification */}
          {notification && (
            <div
              className={`mb-4 p-4 rounded border ${
                notificationType === "success"
                  ? "bg-green-100 text-green-800 border-green-300"
                  : notificationType === "warning"
                  ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                  : "bg-red-100 text-red-800 border-red-300"
              }`}
            >
              {notification}
            </div>
          )}

          {/* Welcome Message */}
          <div className=" mb-4">
            <h1 className="text-lg font-bold">Welcome!</h1>
            <p className="text-gray-500 text-md">Your rewards and recent surveys are ready to review.</p>
          </div>

          {/* Stats */}
          <div className="flex justify-start gap-4 mb-4">
            <div
              className="bg-blue-500 p-4  shadow text-center flex justify-center flex-col"
              style={{ width: "250px", borderRadius: "12px" }}
            >
              <p className="text-white text-md">
                Current Reward Points
              </p>
              <p
                className="text-white font-bold"
                style={{
                  fontSize: `${Math.max(
                    4 - String(user?.points ?? 0).length * 0.5,
                    2
                  )}rem`,
                }}
              >
                {user?.points ?? 0}
              </p>
            </div>

            {/* Redeem Box */}
            <div
              className="bg-blue-50 p-4 rounded  border border-blue-300"
              style={{ width: "400px", borderRadius: "12px" }}
            >
              <h3 className="mb-2 font-semibold text-md">
                Redeem Points
              </h3>

              <input
                type="text"
                placeholder="Enter points (min 50)"
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(e.target.value)}
                className="p-2 bg-white rounded border  w-full"
                style={{ appearance: "textfield" }}
                onWheel={(e) => e.target.blur()} // Prevent scroll increment/decrement
              />

              <p className="mt-2 text-sm text-gray-600">
                Available Points: <b>{user?.points ?? 0}</b>
              </p>
 <div className="flex justify-between flex-row-reverse items-center">
              <button
                onClick={handleRedeem}
                disabled={(user?.points ?? 0) < 50}
                className={`float-end mt-3 p-2 px-4 rounded text-white ${
                  (user?.points ?? 0) < 50 ? "bg-gray-400" : "bg-blue-500"
                }`}
              >
                Redeem Points
              </button>

              {(user?.points ?? 0) < 50 && (
                <p className="text-red-500 italic mt-2" style={{fontSize:"12px"}}>
                  Minimum 50 points required to redeem
                </p>
               
              )}
               </div>
            </div>
          </div>


        




          {/* Recent Surveys */}
          <div className="mb-4">
           
               <h3 className="text-md font-bold ">Completed Surveys</h3>
                <h2 className="text-sm italic mb-4">Total Earned Points (Till Date)  : {totalEarnedPoints}</h2>
           
            
           
            
            <hr className="mb-2 border-gray-300" />
            <table className="w-full text-sm border border-gray-300 border-b-0 rounded-lg shadow-sm">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="py-2 px-4 text-left border-r border-gray-300 font-semibold text-gray-700">Survey</th>
                  <th className="py-2 px-4 text-left border-r border-gray-300 font-semibold text-gray-700">Points</th>
                  <th className="py-2 px-4 text-left font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSurveys.slice(0, 3).map((survey) => (
                  <tr key={survey._id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-r border-gray-300 text-gray-800">{survey.title}</td>
                    <td className="py-2 px-4 border-r border-gray-300 text-gray-800">{survey.rewardPoints}</td>
                    <td className="py-2 px-4 text-gray-600 capitalize">
                      <span
                        className={`px-3 py-1 rounded text-white text-sm font-medium shadow-md ${
                          survey.status === "active"
                            ? "bg-green-500"
                            : "bg-blue-500"
                        }`}
                      >
                        {survey.status === "active" ? "Rewarded" : survey.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredSurveys.length === 0 && (
              <p className="text-gray-500 mt-4">No surveys assigned</p>
            )}
          </div>

          

          

          {/* Display Redemption Requests */}
          <section className=" mt-10">
            <h2 className="text-md font-bold">Redemption Requests Logs</h2>
            <hr className="my-2 border-gray-300" />

            <h3 className="text-md font-semibold mt-4">Pending Requests</h3>
            {pendingRequests.length > 0 ? (
              <table className="w-full text-sm border border-gray-300 border-b-0 rounded-lg shadow-sm">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="py-2 px-4 text-left border-r border-gray-300 font-semibold text-gray-700">Request ID</th>
                    <th className="py-2 px-4 text-left border-r border-gray-300 font-semibold text-gray-700">Points</th>
                    <th className="py-2 px-4 text-left font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingRequests.map((request) => (
                    <tr key={request._id} className="border-b">
                      <td className="py-2 px-4 border-r border-gray-300 text-gray-800">{request._id}</td>
                      <td className="py-2 px-4 border-r border-gray-300 text-gray-800">{request.points}</td>
                      <td className="py-2 px-4 text-gray-800 capitalize">{request.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 italic text-sm">No pending requests.</p>
            )}

            <hr className="my-6 border-gray-300" />

            <h3 className="text-md font-semibold mt-4">Approved Requests</h3>
             <p className="mb-4 text-sm italic">Total Approved Points Till Date: {approvedRequests.reduce((sum, request) => sum + request.points, 0)}</p>
            {approvedRequests.length > 0 ? (
              <>
                <table className="w-full text-sm border border-gray-300 border-b-0 rounded-lg shadow-sm">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="py-2 px-4 text-left border-r border-gray-300 text-gray-800 font-semibold">Request ID</th>
                      <th className="py-2 px-4 text-left border-r border-gray-300 font-semibold text-gray-700">Points</th>
                      <th className="py-2 px-4 text-left font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {approvedRequests.map((request) => (
                      <tr key={request._id} className="border-b">
                        <td className="py-2 px-4 border-r border-gray-300 text-gray-800">{request._id}</td>
                        <td className="py-2 px-4 border-r border-gray-300 text-gray-800">{request.points}</td>
                        <td className="py-2 px-4 text-gray-800 capitalize">{request.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
               
              </>
            ) : (
              <p className="text-sm">No approved requests.</p>
            )}
          </section>

          {errorMessage && <p className="text-red-500 mt-4">{errorMessage}</p>}
        </main>

        {/* Right-side content */}
        

        <aside className="bg-gray-100 p-4 border-r border-gray-300 rounded-lg shadow-md" style={{ width: "250px" }}>
          <h3 className="text-md font-bold text-gray-700 mb-4 text-center">Quick Actions</h3>
          <ul className="space-y-4">
            <li>
              <a
                href="#dashboard"
                className="block bg-blue-500 text-white text-center py-2 px-4 rounded-lg shadow hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                 Dashboard
              </a>
            </li>
            <li>
              <a
                href="/user/redeemPoints"
                className="block bg-green-500 text-white text-center py-2 px-4 rounded-lg shadow hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300"
              >
                Redeem Points
              </a>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

export default UserDashboard;
