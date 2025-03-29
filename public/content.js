chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startAutofill") {
    console.log("Autofill triggered in content script");

    loadApplicationDetails().then((data) => {
      if (data) {
        const result = autofillForm(data.candidate);
        sendResponse(result);
      } else {
        console.log("Failed to load application details.");
      }
    });
  }
  return true;
});

async function loadApplicationDetails() {
  try {
    const response = await fetch(chrome.runtime.getURL("candidate.json"));
    if (!response.ok) throw new Error("Failed to load JSON");

    return await response.json();
  } catch (error) {
    console.error("Error loading JSON:", error);
    return null;
  }
}

function autofillName() {
  const firstNameField = document.querySelector("#first_name");
  if (firstNameField) {
    firstNameField.scrollIntoView({ behavior: "smooth", block: "center" });
    firstNameField.value = "John";
    firstNameField.dispatchEvent(new Event("input", { bubbles: true }));
    console.log("First Name field autofilled!");
  } else {
    console.log("First Name field not found.");
  }
}

function isGreenhouseForm() {
  return (
    document.querySelector("form#application-form") !== null ||
    document.querySelector(".application--form") !== null
  );
}

function autofillForm(profile) {
  // Check if we're on a Greenhouse application page
  if (!isGreenhouseForm()) {
    return {
      success: false,
      message: "Not a Greenhouse application form",
    };
  }

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const autofillWithDelay = async () => {
    try {
      fillBasicInfo(profile);
      await delay(1000);

      if (profile.experience && Array.isArray(profile.experience)) {
        fillWorkExperience(profile.experience);
        await delay(1000);
      }

      if (profile.education && Array.isArray(profile.education)) {
        fillEducation(profile.education);
        await delay(1000);
      }

      //   handleResumeUpload();
      await delay(1000);

      return { success: true };
    } catch (error) {
      console.error("Autofill error:", error);
      return {
        success: false,
        message: "Error filling form: " + error.message,
      };
    }
  };

  return autofillWithDelay();
}

function fillBasicInfo(profile) {
  // Map of common field names to their likely input IDs or names
  const fieldMap = {
    firstName: ["first_name", "firstName", "given-name", "first-name"],
    lastName: ["last_name", "lastName", "family-name", "last-name"],
    email: ["email", "email_address", "emailAddress"],
    phone: ["phone", "phone_number", "phoneNumber", "mobile_phone"],
    linkedin: ["linkedin", "linkedinUrl", "linkedin_url"],
    website: ["website", "personal_website", "portfolio"],
    gender: ["gender"],
    city: ["city", "candidate_location"],
  };

  for (const [profileField, possibleFormFields] of Object.entries(fieldMap)) {
    if (profile[profileField]) {
      const value = profile[profileField];
      let filled = false;

      // Try each possible form field name
      for (const formField of possibleFormFields) {
        // Try by ID
        let input = document.getElementById(formField);
        // Try by name
        if (!input) input = document.querySelector(`[name="${formField}"]`);
        // Try by placeholder
        if (!input)
          input = document.querySelector(
            `[placeholder*="${formField.replace("_", " ")}"]`
          );

        if (input) {
          fillInputField(input, value);
          filled = true;
          break;
        }
      }

      // If we couldn't find a field by common names, try looking for labels
      if (!filled) {
        const labels = Array.from(document.querySelectorAll("label"));
        for (const label of labels) {
          const labelText = label.textContent.toLowerCase();
          const fieldName = profileField
            .replace(/([A-Z])/g, " $1")
            .toLowerCase();

          if (labelText.includes(fieldName)) {
            const inputId = label.getAttribute("for");
            if (inputId) {
              const input = document.getElementById(inputId);
              if (input) {
                fillInputField(input, value);
                break;
              }
            }
          }
        }
      }
    }
  }
}

function fillInputField(input, value) {
  if (!input) return;

  input.scrollIntoView({ behavior: "smooth", block: "center" });

  const tagName = input.tagName.toLowerCase();

  if (tagName === "input") {
    const inputType = input.type.toLowerCase();

    if (
      inputType === "text" ||
      inputType === "email" ||
      inputType === "number" ||
      inputType === "tel" ||
      inputType === "url" ||
      inputType === "hidden"
    ) {
      input.value = value;
      triggerEvent(input, "input");
      triggerEvent(input, "change");
    } else if (inputType === "radio") {
      // For radio buttons, find the one with matching value
      const radioGroup = document.querySelectorAll(
        `input[name="${input.name}"]`
      );
      for (const radio of radioGroup) {
        if (radio.value.toLowerCase() === String(value).toLowerCase()) {
          radio.checked = true;
          triggerEvent(radio, "change");
          break;
        }
      }
    } else if (inputType === "checkbox") {
      input.checked = Boolean(value);
      triggerEvent(input, "change");
    } else if (inputType === "date") {
      // Format date strings to YYYY-MM-DD
      if (typeof value === "string") {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          const formattedDate = date.toISOString().split("T")[0];
          input.value = formattedDate;
          triggerEvent(input, "change");
        }
      } else {
        input.value = value;
        triggerEvent(input, "change");
      }
    }
  } else if (tagName === "textarea") {
    input.value = value;
    triggerEvent(input, "input");
    triggerEvent(input, "change");
  } else if (tagName === "select") {
    // For select elements, find the option with matching text or value
    const options = Array.from(input.options);
    const valueStr = String(value).toLowerCase();

    // First try exact match
    let matched = false;
    for (const option of options) {
      if (
        option.value.toLowerCase() === valueStr ||
        option.text.toLowerCase() === valueStr
      ) {
        input.value = option.value;
        triggerEvent(input, "change");
        matched = true;
        break;
      }
    }

    // If no exact match, try partial match
    if (!matched) {
      for (const option of options) {
        if (
          option.value.toLowerCase().includes(valueStr) ||
          option.text.toLowerCase().includes(valueStr)
        ) {
          input.value = option.value;
          triggerEvent(input, "change");
          break;
        }
      }
    }
  }
}

function fillEducation(educations) {
  // Look for education section or "Add Education" button
  const educationForm = document.querySelector(".education--container");
  const addEducationBtn = educationForm
    ? Array.from(educationForm.querySelectorAll("button")).find(
        (btn) =>
          btn.textContent.toLowerCase().includes("add education") ||
          btn.textContent.toLowerCase().includes("add another")
      )
    : null;

  // For each education entry in our profile
  for (let i = 0; i < educations.length; i++) {
    const edu = educations[i];

    // If not the first entry, we may need to click "Add Education" button
    if (i > 0 && addEducationBtn) {
      addEducationBtn.click();
      // Wait a moment for the new fields to appear
      setTimeout(() => {
        fillEducationEntry(edu, i);
      }, 500);
    } else {
      fillEducationEntry(edu, i);
    }
  }
}

function fillEducationEntry(edu, index) {
  // Common field patterns for education
  const fieldMap = {
    school: ["school", "university", "institution", "school_name"],
    degree: ["degree", "degree_type", "qualification"],
    discipline: [
      "discipline",
      "field",
      "major",
      "field_of_study",
      "concentration",
    ],
    startDate: ["start-year", "start_date_year", "start_date", "from_date"],
  };

  // For education sections that use indexed IDs
  const indexedFieldMap = {};
  for (const [key, values] of Object.entries(fieldMap)) {
    indexedFieldMap[key] = values.map((v) => `${v}--${index}`).concat(values);
  }

  // Fill each field
  for (const [eduField, possibleFormFields] of Object.entries(
    indexedFieldMap
  )) {
    if (edu[eduField] !== undefined) {
      for (const formField of possibleFormFields) {
        // Try various selector strategies
        let input = document.getElementById(formField);
        if (!input) input = document.querySelector(`[name="${formField}"]`);
        if (!input)
          input = document.querySelector(
            `[name*="${formField}"][name*="${index}"]`
          );

        if (input) {
          // Handle checkboxes for "current education"
          if (eduField === "current" && input.type === "checkbox") {
            input.checked = edu[eduField];
            triggerEvent(input, "change");
          } else {
            fillInputField(input, edu[eduField]);
          }
          break;
        }
      }
    }
  }
}

function fillWorkExperience(experiences) {
  const experienceForm = document.querySelector(".experience--container");
  const addExperienceBtn = experienceForm
    ? Array.from(experienceForm.querySelectorAll("button")).find(
        (btn) =>
          btn.textContent.toLowerCase().includes("add experience") ||
          btn.textContent.toLowerCase().includes("add another position")
      )
    : null;

  // For each experience entry in our profile
  for (let i = 0; i < experiences.length; i++) {
    const exp = experiences[i];

    // If not the first entry, we may need to click "Add Experience" button
    if (i > 0 && addExperienceBtn) {
      addExperienceBtn.click();
      // Wait a moment for the new fields to appear
      setTimeout(() => {
        fillExperienceEntry(exp, i);
      }, 500);
    } else {
      fillExperienceEntry(exp, i);
    }
  }
}

function fillExperienceEntry(exp, index) {
  // Common field patterns for work experience
  const fieldMap = {
    company: ["company", "employer", "organization", "company_name"],
    title: ["title", "job_title", "position", "role"],
    startDate: ["start_date", "startDate", "employment_period_start"],
    endDate: ["end_date", "endDate", "employment_period_end"],
    current: ["current_position", "currently_employed", "current_job"],
    description: ["description", "job_description", "responsibilities"],
  };

  // For experience sections that use indexed IDs
  const indexedFieldMap = {};
  for (const [key, values] of Object.entries(fieldMap)) {
    indexedFieldMap[key] = values.map((v) => `${v}--${index}`).concat(values);
  }

  // Fill each field
  for (const [expField, possibleFormFields] of Object.entries(
    indexedFieldMap
  )) {
    if (exp[expField] !== undefined) {
      for (const formField of possibleFormFields) {
        // Try various selector strategies
        let input = document.getElementById(formField);
        if (!input) input = document.querySelector(`[name="${formField}"]`);
        if (!input)
          input = document.querySelector(
            `[name*="${formField}"][name*="${index}"]`
          );

        if (input) {
          // Handle checkboxes for "current position"
          if (expField === "current" && input.type === "checkbox") {
            input.checked = exp[expField];
            triggerEvent(input, "change");
          } else {
            fillInputField(input, exp[expField]);
          }
          break;
        }
      }
    }
  }
}

function handleResumeUpload() {
  // Get resume data from storage
  chrome.storage.local.get(["greenhouseResume"], (result) => {
    if (!result.greenhouseResume) return;

    // Find resume upload input
    const resumeInput = document.querySelector(
      'input[type="file"][accept*=".pdf"], input[type="file"][accept*=".doc"]'
    );

    if (resumeInput) {
      // Convert base64 back to a file
      const resumeData = result.greenhouseResume;
      const byteString = atob(resumeData.content.split(",")[1]);
      const mimeType = resumeData.content
        .split(",")[0]
        .split(":")[1]
        .split(";")[0];

      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      const blob = new Blob([ab], { type: mimeType });
      const file = new File([blob], resumeData.name, { type: mimeType });

      // Create a DataTransfer object to set the file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      resumeInput.files = dataTransfer.files;

      // Trigger change event
      triggerEvent(resumeInput, "change");
    }
  });
}

// Helper function to trigger events
function triggerEvent(element, eventType) {
  const event = new Event(eventType, { bubbles: true });
  element.dispatchEvent(event);
}
