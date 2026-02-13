import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchAvailableJobs, fetchStudentApplications, applyForJob } from '../../services/volunteerService';
import { Calendar, MapPin, Users, Star, RefreshCw, CheckCircle, Clock } from 'lucide-react';

const VolunteerGallery = () => {
    const { profileData, user } = useAuth(); // profileData now has .id
    const [activeTab, setActiveTab] = useState('gallery'); // 'gallery' | 'my-jobs'
    const [jobs, setJobs] = useState([]);
    const [myApplications, setMyApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [applyingId, setApplyingId] = useState(null);
    const [toast, setToast] = useState(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fetchedJobs, fetchedApps] = await Promise.all([
                fetchAvailableJobs(),
                profileData?.id ? fetchStudentApplications(profileData.id) : []
            ]);
            setJobs(fetchedJobs);
            setMyApplications(fetchedApps);
        } catch (error) {
            console.error("Error loading data:", error);
            showToast("Failed to load data", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (profileData?.id) {
            loadData();
        }
    }, [profileData]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleApply = async (job) => {
        if (!profileData?.id) return;

        setApplyingId(job.id);
        try {
            const studentName = `${profileData.FirstName || ''} ${profileData.LastName || ''}`.trim() || user.email;
            await applyForJob(job.id, profileData.id, studentName);
            showToast("Successfully applied!");
            await loadData(); // Refresh data to see updated slots and "Applied" status
        } catch (error) {
            console.error("Application failed:", error);
            showToast(typeof error === 'string' ? error : "Application failed", "error");
        } finally {
            setApplyingId(null);
        }
    };

    const isJobApplied = (jobId) => {
        return myApplications.some(app => app.jobId === jobId);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Volunteer Opportunities</h1>
                    <p className="text-gray-500 mt-1">Collect points by helping your community</p>
                </div>

                <div className="flex items-center gap-4 bg-white p-1 rounded-lg shadow-sm">
                    <button
                        onClick={() => setActiveTab('gallery')}
                        className={`px-4 py-2 rounded-md transition-all ${activeTab === 'gallery' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Gallery
                    </button>
                    <button
                        onClick={() => setActiveTab('my-jobs')}
                        className={`px-4 py-2 rounded-md transition-all ${activeTab === 'my-jobs' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        My Jobs ({myApplications.length})
                    </button>
                </div>
            </div>

            {/* Refresh & Status */}
            <div className="flex justify-end mb-6">
                <button
                    onClick={loadData}
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    Refresh Data
                </button>
            </div>

            {/* Content */}
            {loading && jobs.length === 0 ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeTab === 'gallery' ? (
                        jobs.map(job => (
                            <JobCard
                                key={job.id}
                                job={job}
                                applied={isJobApplied(job.id)}
                                onApply={() => handleApply(job)}
                                applying={applyingId === job.id}
                            />
                        ))
                    ) : (
                        // My Jobs View - Filter jobs based on applications
                        myApplications.map(app => {
                            const job = jobs.find(j => j.id === app.jobId);
                            // If job data is not found (e.g. inactive or deleted), show simplified card
                            return job ? (
                                <JobCard key={app.id} job={job} applied={true} readOnly={true} />
                            ) : (
                                <div key={app.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <p className="text-gray-500 italic">Job details unavailable</p>
                                    <p className="text-xs text-gray-400">Applied on: {app.appliedAt?.toDate().toLocaleDateString()}</p>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {!loading && activeTab === 'gallery' && jobs.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    No active volunteer jobs found.
                </div>
            )}

            {!loading && activeTab === 'my-jobs' && myApplications.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    You haven't applied to any jobs yet.
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
};

// Sub-component for Job Card
const JobCard = ({ job, applied, onApply, applying, readOnly = false }) => {
    const isFull = job.remainingSlots <= 0;
    const canApply = !applied && !isFull && !readOnly;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
            <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900 leading-tight line-clamp-2">{job.title}</h3>
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <Star size={12} fill="currentColor" />
                        +{job.points} pts
                    </span>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="flex items-center text-gray-600 text-sm">
                        <Users size={16} className="mr-2 text-indigo-500" />
                        <span className="font-medium mr-1">Supervisor:</span> {job.supervisor || "N/A"}
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                        <MapPin size={16} className="mr-2 text-indigo-500" />
                        <span className="truncate">{job.location || "TBA"}</span>
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                        <Calendar size={16} className="mr-2 text-indigo-500" />
                        <span>{job.date || "Date TBA"}</span>
                    </div>
                    {/* Add time if available in job object, assumed to be part of date or separate field */}
                </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                <div className="text-sm">
                    <span className={`font-semibold ${isFull ? 'text-red-500' : 'text-green-600'}`}>
                        {job.remainingSlots}
                    </span>
                    <span className="text-gray-500"> / {job.totalSlots || "?"} slots left</span>
                </div>

                {!readOnly && (
                    <button
                        onClick={onApply}
                        disabled={!canApply || applying}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                            ${applied
                                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                                : isFull
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow'
                            }
                            ${applying ? 'opacity-70 cursor-wait' : ''}
                        `}
                    >
                        {applying ? (
                            <>Applying...</>
                        ) : applied ? (
                            <><CheckCircle size={16} /> Applied</>
                        ) : isFull ? (
                            "Full"
                        ) : (
                            "Apply Now"
                        )}
                    </button>
                )}

                {readOnly && (
                    <span className="px-4 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700 cursor-default flex items-center gap-2">
                        <CheckCircle size={16} /> Registered
                    </span>
                )}
            </div>
        </div>
    );
};

export default VolunteerGallery;
