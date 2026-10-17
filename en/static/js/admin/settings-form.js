// ------------------------------------------------------------
// Initialize settings form
// ------------------------------------------------------------

function initSettingsForm() {

  const form =
    document.getElementById(
      "settingsForm"
    );

  if (!form) return;

  // Load active/inactive ad components
  loadAdComponents();
    // ==========================================================
  // THEME PRESET
  // ==========================================================

  const themePreset =
    document.getElementById(
      "themePreset"
    );

  if (themePreset) {

    themePreset.addEventListener(
      "change",
      () => {

        if (
          themePreset.value !== "custom"
        ) {

          applyThemePreset(
            themePreset.value
          );

        }

      }
    );

  }

    // ============================================================
  // LIVE THEME PREVIEW
  // ============================================================

  function updateThemePreview() {

    const preview =
      document.getElementById(
        "themePreview"
      );

    if (!preview) return;


    const getValue = id => {

      const el =
        document.getElementById(id);

      return el
        ? el.value
        : "";

    };


    const primary =
      getValue("themePrimary") ||
      "#8b5cf6";

    const primaryHover =
      getValue("themePrimaryHover") ||
      "#7c3aed";

    const secondary =
      getValue("themeSecondary") ||
      "#ec4899";

    const secondaryHover =
      getValue("themeSecondaryHover") ||
      "#db2777";

    const accent =
      getValue("themeAccent") ||
      "#22d3ee";

    const background =
      getValue("themeBackground") ||
      "#050505";

    const surface =
      getValue("themeSurface") ||
      "#0f0f12";

    const surfaceAlt =
      getValue("themeSurfaceAlt") ||
      "#15151a";

    const text =
      getValue("themeText") ||
      "#ffffff";

    const textMuted =
      getValue("themeTextMuted") ||
      "#a1a1aa";

    const border =
      getValue("themeBorder") ||
      "#27272a";

    const buttonText =
      getValue("themeButtonText") ||
      "#ffffff";


    const cardRadius =
      document.querySelector(
        '[name="theme_card_radius"]'
      )?.value ||
      "12px";


    const buttonRadius =
      document.querySelector(
        '[name="theme_button_radius"]'
      )?.value ||
      "8px";


    // ----------------------------------------------------------
    // Preview container
    // ----------------------------------------------------------

    preview.style.backgroundColor =
      background;

    preview.style.color =
      text;

    preview.style.borderColor =
      border;


    // ----------------------------------------------------------
    // Preview card
    // ----------------------------------------------------------

    const card =
      document.getElementById(
        "themePreviewCard"
      );

    if (card) {

      card.style.backgroundColor =
        surface;

      card.style.borderColor =
        border;

      card.style.borderRadius =
        cardRadius;

      card.style.color =
        text;

    }


    // ----------------------------------------------------------
    // Preview heading
    // ----------------------------------------------------------

    const heading =
      document.getElementById(
        "themePreviewHeading"
      );

    if (heading) {

      heading.style.color =
        text;

    }


    // ----------------------------------------------------------
    // Preview description
    // ----------------------------------------------------------

    const description =
      document.getElementById(
        "themePreviewDescription"
      );

    if (description) {

      description.style.color =
        textMuted;

    }


    // ----------------------------------------------------------
    // Preview muted text
    // ----------------------------------------------------------

    const muted =
      document.getElementById(
        "themePreviewMuted"
      );

    if (muted) {

      muted.style.color =
        textMuted;

    }


    // ----------------------------------------------------------
    // Primary button
    // ----------------------------------------------------------

    const primaryButton =
      document.getElementById(
        "themePreviewPrimary"
      );

    if (primaryButton) {

      primaryButton.style.backgroundColor =
        primary;

      primaryButton.style.color =
        buttonText;

      primaryButton.style.borderColor =
        primary;

      primaryButton.style.borderRadius =
        buttonRadius;

      primaryButton.onmouseenter =
        () => {

          primaryButton.style.backgroundColor =
            primaryHover;

        };

      primaryButton.onmouseleave =
        () => {

          primaryButton.style.backgroundColor =
            primary;

        };

    }


    // ----------------------------------------------------------
    // Secondary button
    // ----------------------------------------------------------

    const secondaryButton =
      document.getElementById(
        "themePreviewSecondary"
      );

    if (secondaryButton) {

      secondaryButton.style.backgroundColor =
        "transparent";

      secondaryButton.style.color =
        secondary;

      secondaryButton.style.borderColor =
        secondary;

      secondaryButton.style.borderRadius =
        buttonRadius;

      secondaryButton.onmouseenter =
        () => {

          secondaryButton.style.backgroundColor =
            secondary;

          secondaryButton.style.color =
            buttonText;

        };

      secondaryButton.onmouseleave =
        () => {

          secondaryButton.style.backgroundColor =
            "transparent";

          secondaryButton.style.color =
            secondary;

        };

    }


    // ----------------------------------------------------------
    // Color swatches
    // ----------------------------------------------------------

    const swatches =
      preview.querySelectorAll(
        "[data-theme-preview-color]"
      );


    swatches.forEach(
      swatch => {

        const type =
          swatch.dataset.themePreviewColor;


        if (type === "primary") {

          swatch.style.backgroundColor =
            primary;

        }


        if (type === "secondary") {

          swatch.style.backgroundColor =
            secondary;

        }


        if (type === "accent") {

          swatch.style.backgroundColor =
            accent;

        }


        if (type === "background") {

          swatch.style.backgroundColor =
            background;

        }


        if (type === "surface") {

          swatch.style.backgroundColor =
            surface;

        }

      }
    );

  }


  // ------------------------------------------------------------
  // Listen to every theme input
  // ------------------------------------------------------------

  const themeInputs = [

    "themePreset",

    "themePrimary",

    "themePrimaryHover",

    "themeSecondary",

    "themeSecondaryHover",

    "themeAccent",

    "themeBackground",

    "themeSurface",

    "themeSurfaceAlt",

    "themeText",

    "themeTextMuted",

    "themeBorder",

    "themeButtonText"

  ];


  themeInputs.forEach(
    id => {

      const input =
        document.getElementById(id);

      if (!input) return;

      input.addEventListener(
        "input",
        updateThemePreview
      );

      input.addEventListener(
        "change",
        updateThemePreview
      );

    }
  );


  const radiusInputs =
    document.querySelectorAll(
      '[name="theme_card_radius"], [name="theme_button_radius"]'
    );


  radiusInputs.forEach(
    input => {

      input.addEventListener(
        "input",
        updateThemePreview
      );

    }
  );


  // Initial preview

  updateThemePreview();

  


  const addButton =
    document.getElementById(
      "addComplianceBtn"
    );

  if (addButton) {

    addButton.addEventListener(
      "click",
      addComplianceRow
    );

  }

  const addFeaturesSectionButton =
  document.getElementById(
    "addFeaturesSectionBtn"
  );

if (addFeaturesSectionButton) {
  addFeaturesSectionButton.addEventListener(
    "click",
    () => {

      homepageSections.push(
        createHomepageSection(
          "features"
        )
      );

      renderHomepageSections();
    }
  );
}


const addTextSectionButton =
  document.getElementById(
    "addTextSectionBtn"
  );

if (addTextSectionButton) {
  addTextSectionButton.addEventListener(
    "click",
    () => {

      homepageSections.push(
        createHomepageSection(
          "text"
        )
      );

      renderHomepageSections();
    }
  );
}


const addCardsSectionButton =
  document.getElementById(
    "addCardsSectionBtn"
  );

if (addCardsSectionButton) {
  addCardsSectionButton.addEventListener(
    "click",
    () => {

      homepageSections.push(
        createHomepageSection(
          "cards"
        )
      );

      renderHomepageSections();
    }
  );
}


  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const alertEl =
        document.getElementById(
          "settingsFormAlert"
        );

      try {

        const formData =
          new FormData(form);

        const payload = {};


        for (
          const [key, value]
          of formData.entries()
        ) {

          payload[key] =
            String(value);

        }

        // The homepage hero is managed on Dashboard > Header & Hero. Only send
        // these when the checkboxes exist on this page, otherwise saving here
        // would switch the hero off.
        const heroEnabled =
  document.getElementById("siteHeroEnabled");

if (heroEnabled) {
  payload.site_hero_enabled =
    heroEnabled.checked
      ? "true"
      : "false";
}


const heroOverlay =
  document.getElementById("siteHeroOverlay");

if (heroOverlay) {
  payload.site_hero_overlay =
    heroOverlay.checked
      ? "true"
      : "false";
}

const gpwaSealEnabledInput =
  document.getElementById("gpwaSealEnabled");

payload.gpwa_seal_enabled =
  gpwaSealEnabledInput && gpwaSealEnabledInput.checked
    ? "true"
    : "false";

        payload.footer_compliance =
          JSON.stringify(
            collectComplianceRows()
          );

        payload.homepage_sections =
          JSON.stringify(
            collectHomepageSections()
          );


        const res =
          await fetch(
            "/en/api/v1/settings/save",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json"
              },
              body:
                JSON.stringify(payload)
            }
          );


        const data =
          await res.json();


        if (!res.ok || data.success === false) {

          throw new Error(
            data.error ||
            "Failed to save settings"
          );

        }


        if (alertEl) {

          alertEl.style.display =
            "block";

          alertEl.textContent =
            "Site settings saved successfully.";

        }

      } catch (error) {

        console.error(
          "Failed to save settings:",
          error
        );

        if (alertEl) {

          alertEl.style.display =
            "block";

          alertEl.textContent =
            error.message ||
            "Failed to save settings.";

        }

      }

    }
  );
}


