document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const signupContainer = document.getElementById("signup-container");
  const loginTrigger = document.getElementById("teacher-login-trigger");
  const logoutButton = document.getElementById("teacher-logout");
  const teacherStatus = document.getElementById("teacher-status");
  const loginDialog = document.getElementById("teacher-login-dialog");
  const loginForm = document.getElementById("teacher-login-form");
  const loginMessage = document.getElementById("login-message");
  let teacherAuthorization = null;
  let teacherUsername = "";

  function updateTeacherControls() {
    const isTeacher = Boolean(teacherAuthorization);
    signupContainer.classList.toggle("hidden", !isTeacher);
    loginTrigger.classList.toggle("hidden", isTeacher);
    logoutButton.classList.toggle("hidden", !isTeacher);
    teacherStatus.classList.toggle("hidden", !isTeacher);
    teacherStatus.textContent = isTeacher ? `Signed in as ${teacherUsername}` : "";
  }

  function teacherHeaders() {
    return teacherAuthorization
      ? { Authorization: teacherAuthorization }
      : {};
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        const title = document.createElement("h4");
        title.textContent = name;
        activityCard.appendChild(title);

        const description = document.createElement("p");
        description.textContent = details.description;
        activityCard.appendChild(description);

        const schedule = document.createElement("p");
        schedule.textContent = `Schedule: ${details.schedule}`;
        activityCard.appendChild(schedule);

        const availability = document.createElement("p");
        availability.textContent = `Availability: ${spotsLeft} spots left`;
        activityCard.appendChild(availability);

        const participantsContainer = document.createElement("div");
        participantsContainer.className = "participants-container";
        if (details.participants.length > 0) {
          const participantsSection = document.createElement("div");
          participantsSection.className = "participants-section";
          const participantsHeading = document.createElement("h5");
          participantsHeading.textContent = "Participants:";
          participantsSection.appendChild(participantsHeading);

          const participantsList = document.createElement("ul");
          participantsList.className = "participants-list";
          details.participants.forEach((email) => {
            const participant = document.createElement("li");
            const participantEmail = document.createElement("span");
            participantEmail.className = "participant-email";
            participantEmail.textContent = email;
            participant.appendChild(participantEmail);

            if (teacherAuthorization) {
              const removeButton = document.createElement("button");
              removeButton.className = "delete-btn";
              removeButton.type = "button";
              removeButton.textContent = "Remove";
              removeButton.setAttribute("aria-label", `Unregister ${email} from ${name}`);
              removeButton.addEventListener("click", () => handleUnregister(name, email));
              participant.appendChild(removeButton);
            }

            participantsList.appendChild(participant);
          });
          participantsSection.appendChild(participantsList);
          participantsContainer.appendChild(participantsSection);
        } else {
          const emptyMessage = document.createElement("p");
          emptyMessage.textContent = "No participants yet";
          participantsContainer.appendChild(emptyMessage);
        }
        activityCard.appendChild(participantsContainer);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(activity, email) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: teacherHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: teacherHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  loginTrigger.addEventListener("click", () => {
    loginMessage.classList.add("hidden");
    loginDialog.showModal();
  });

  document.getElementById("teacher-login-cancel").addEventListener("click", () => {
    loginDialog.close();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("teacher-username").value.trim();
    const password = document.getElementById("teacher-password").value;
    const authorization = `Basic ${btoa(`${username}:${password}`)}`;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { Authorization: authorization },
      });
      const result = await response.json();
      if (!response.ok) {
        loginMessage.textContent = result.detail || "Unable to log in";
        loginMessage.className = "message error";
        return;
      }

      teacherAuthorization = authorization;
      teacherUsername = result.username;
      loginForm.reset();
      loginDialog.close();
      updateTeacherControls();
      fetchActivities();
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "message error";
      console.error("Error logging in:", error);
    }
  });

  logoutButton.addEventListener("click", () => {
    teacherAuthorization = null;
    teacherUsername = "";
    updateTeacherControls();
    fetchActivities();
  });

  // Initialize app
  updateTeacherControls();
  fetchActivities();
});
