import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  timeout: 60000,
});

const getMessage = (error) =>
  error?.response?.data?.detail || error?.message || "Something went wrong.";

export const fetchDashboard = async (userId = "demo-user") => {
  try {
    const response = await api.get("/dashboard", {
      params: { user_id: userId },
    });
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error));
  }
};

export const resetDashboard = async (userId = "demo-user") => {
  try {
    const response = await api.delete("/dashboard/reset", {
      params: { user_id: userId },
    });
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error));
  }
};

export const uploadResume = async (file, userId = "demo-user") => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);

  try {
    const response = await api.post("/resume/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error));
  }
};

export const analyzeResume = async (payload) => {
  try {
    const response = await api.post("/resume/analyze", payload);
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error));
  }
};

export const matchJobs = async (payload) => {
  try {
    const response = await api.post("/jobs/match", payload);
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error));
  }
};

export const improveResume = async (payload) => {
  try {
    const response = await api.post("/resume/improve", payload);
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error));
  }
};
