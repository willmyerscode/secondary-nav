class SecondaryNav {
  static pluginTitle = "wmSecondaryNav";
  static defaultSettings = {
    demo: "value",
    sectionTheme: "adaptive",
    desktopPosition: "top",
    mobilePosition: "overlay-bottom",
    desktopLayout: "nav-right",
    sticky: false,
  };
  static get userSettings() {
    return window["wmSecondaryNavSettings"] || {};
  }
  constructor(el) {
    this.el = el;
    // this.source = el.dataset.source;
    this.loadingState = "building";

    this.settings = this.deepMerge(
      {},
      SecondaryNav.defaultSettings,
      SecondaryNav.userSettings,
      this.instanceSettings
    );

    this.isSticky = this.settings.sticky && this.settings.desktopPosition === "bottom" && Static.SQUARESPACE_CONTEXT.tweakJSON['tweak-fixed-header'] === 'false';
    // this.dataAttribute = this.el.getAttribute("data-attribute");
    // if (this.dataAttribute) {
    //   this.dataAttribute = this.dataAttribute.toLowerCase();
    //   this.dataAttribute = this.dataAttribute.trim();
    // }
    // console.log(this.dataAttribute);

    this.init();
  }
  async init() {
    const self = this;
    this.emitEvent("wmSecondaryNav:beforeInit", self);
    this.handleMissingColorTheme();
    this.buildStructure();
    this.addScrollEventListener();
    this.loadingState = "built";
    this.emitEvent("wmSecondaryNav:afterInit", self);
  }

  buildStructure() {
    this.plugin = document.createElement("div");
    this.plugin.classList.add("secondary-nav");
    this.plugin.setAttribute("data-wm-plugin", "secondary-nav");

    if (this.settings.sectionTheme) {
      const themes = {
        "lightest-1": "white",
        "lightest-2": "white-bold",
        "light-1": "light",
        "light-2": "light-bold",
        bright: "bright-inverse",
        "bright-2": "bright",
        "dark-1": "dark",
        "dark-2": "dark-bold",
        "darkest-1": "black",
        "darkest-2": "black-bold",
        "lightest 1": "white",
        "lightest 2": "white-bold",
        "light 1": "light",
        "light 2": "light-bold",
        "bright 1": "bright-inverse",
        "bright 2": "bright",
        "dark 1": "dark",
        "dark 2": "dark-bold",
        "darkest 1": "black",
        "darkest 2": "black-bold",
        lightest: "white",
        light: "light",
        dark: "dark",
        darkest: "black",
        adaptive: "adaptive",
      };
      this.plugin.dataset.sectionTheme = themes[this.settings.sectionTheme];
    }

    if (this.isSticky) {
      this.stickyWrapper = document.createElement("div");
      this.stickyWrapper.classList.add("sticky-placeholder");
    }

    this.secondaryWrapper = document.createElement("div");
    this.secondaryWrapper.classList.add("secondary-wrapper", "header-inner");
    this.plugin.appendChild(this.secondaryWrapper);

    const brandingItems = this.el.querySelectorAll(
      "SecondaryTitle, SecondaryLogo"
    );
    this.brandingWrapper = document.createElement("div");
    this.brandingWrapper.classList.add(
      "secondary-branding-wrapper",
      "header-title-text"
    );
    this.secondaryWrapper.appendChild(this.brandingWrapper);

    this.secondaryLinks = document.createElement("div");
    this.secondaryLinks.classList.add("secondary-links", "header-nav-wrapper");
    this.secondaryWrapper.appendChild(this.secondaryLinks);

    this.secondaryHeaderActions = document.createElement("div");
    this.secondaryHeaderActions.classList.add(
      "secondary-header-actions",
      "header-actions",
      "header-actions--right"
    );
    this.secondaryWrapper.appendChild(this.secondaryHeaderActions);

    this.mobileLinks = document.createElement("div");
    this.mobileLinks.classList.add(
      "secondary-header-menu-nav-wrapper",
      "header-menu-nav-wrapper"
    );

    this.header = document.getElementById("header");
    this.root = document.documentElement;

    this.setLayout();
    this.buildSecondaryLinks();
    this.buildSecondaryHeaderActions();
    this.buildBrandingWrapper();
    this.loadSocialIcons();
    this.placeNav();

    this.headerSizing();
    this.header.addEventListener("transitionend", this.headerSizing());
    window.addEventListener("scroll", () =>
      setTimeout(this.headerSizing(), 150)
    );
  }
  handleMissingColorTheme() {
    const expectedSelectors = [
      '[data-section-theme="white"]',
      '[data-section-theme="white-bold"]',
      '[data-section-theme="light"]',
      '[data-section-theme="light-bold"]',
      '[data-section-theme="bright"]',
      '[data-section-theme="bright-inverse"]',
      '[data-section-theme="dark"]',
      '[data-section-theme="dark-bold"]',
      '[data-section-theme="black"]',
      '[data-section-theme="black-bold"]',
    ];

    // Function to fetch and process the stylesheet
    async function addMissingColorTheme() {
      try {
        // Fetch the stylesheet
        const response = await fetch("/site.css");
        const cssText = await response.text();

        // Parse the CSS
        const styleSheet = new CSSStyleSheet();
        styleSheet.replaceSync(cssText);

        // Find existing selectors
        const existingSelectors = new Set();
        for (const rule of styleSheet.cssRules) {
          if (rule.selectorText) {
            expectedSelectors.forEach(selector => {
              if (rule.selectorText.includes(selector)) {
                existingSelectors.add(selector);
              }
            });
          }
        }

        // Find the missing selector
        const missingSelector = expectedSelectors.find(
          selector => !existingSelectors.has(selector)
        );

        // Get the CSS declaration for the second rule starting with :root
        let rootRuleCount = 0;
        let secondRootRuleDeclaration = "";
        for (const rule of styleSheet.cssRules) {
          if (rule.selectorText && rule.selectorText.startsWith(":root")) {
            rootRuleCount++;
            if (rootRuleCount === 2) {
              for (let i = 0; i < rule.style.length; i++) {
                const property = rule.style[i];
                const value = rule.style.getPropertyValue(property);
                secondRootRuleDeclaration += `${property}: ${value}; `;
              }
              break; // Stop after finding the second :root rule
            }
          }
        }

        if (rootRuleCount < 2) {
          console.log("There is no second :root rule in the stylesheet.");
        }

        if (missingSelector) {
          // Create a new stylesheet for the missing selector, including the second :root declaration
          const newStyleSheet = new CSSStyleSheet();
          newStyleSheet.insertRule(
            `:root, ${missingSelector} { ${secondRootRuleDeclaration} }`,
            0
          );

          // Convert the new stylesheet to text
          let newCssText = "";
          for (const rule of newStyleSheet.cssRules) {
            newCssText += rule.cssText + "\n";
          }

          // Create a new style element
          const newStyleElement = document.createElement("style");
          newStyleElement.textContent = newCssText;

          // Find the existing stylesheet link element
          const existingStylesheet = document.querySelector(
            'link[href$="site.css"]'
          );

          // Insert the new style element before the existing stylesheet
          if (existingStylesheet) {
            existingStylesheet.parentNode.insertBefore(
              newStyleElement,
              existingStylesheet
            );
          } else {
            console.error(
              "Could not find the existing stylesheet link element."
            );
          }
        }
      } catch (error) {
        console.error("Error processing stylesheet:", error);
      }
    }
    addMissingColorTheme();
  }
  buildBrandingWrapper() {
    const brandingItems = this.el.querySelectorAll(
      "SecondaryTitle, SecondaryLogo"
    );
    if (!brandingItems.length) return;

    Array.from(brandingItems).forEach(child => {
      if (child.tagName === "SECONDARYTITLE") {
        let secondaryTitle;
        if (child.getAttribute("href")) {
          secondaryTitle = document.createElement("a");
          secondaryTitle.classList.add("secondary-title");
          secondaryTitle.href = child.getAttribute("href", "#");
        } else {
          secondaryTitle = document.createElement("span");
          secondaryTitle.classList.add("secondary-title");
        }
        secondaryTitle.textContent = child.textContent;
        this.brandingWrapper.appendChild(secondaryTitle);
      } else if (child.tagName === "SECONDARYLOGO") {
        let secondaryLogo;
        if (child.getAttribute("href")) {
          secondaryLogo = document.createElement("a");
          secondaryLogo.classList.add("secondary-logo", "header-title-logo");
          secondaryLogo.href = child.getAttribute("href", "#");
        } else {
          secondaryLogo = document.createElement("div");
          secondaryLogo.classList.add("secondary-logo", "header-title-logo");
        }

        const secondaryLogoImage = document.createElement("img");
        secondaryLogoImage.src = child.getAttribute("src", "");
        secondaryLogo.appendChild(secondaryLogoImage);

        this.brandingWrapper.appendChild(secondaryLogo);
      }
    });
  }
  buildSecondaryLinks() {
    const navLinks = this.el.querySelectorAll(
      "SecondaryLink, SecondaryDropdown"
    );
    if (!navLinks.length) return;

    Array.from(navLinks).forEach(child => {
      if (child.tagName === "SECONDARYLINK") {
        this.buildSecondaryLink(child);
        this.buildMobileLink(child);
      } else if (child.tagName === "SECONDARYDROPDOWN") {
        this.buildSecondaryDropdown(child);
        this.buildMobileDropdown(child);
      }
    });
  }
  buildSecondaryLink(child) {
    const linkWrapper = document.createElement("div");
    linkWrapper.classList.add("wm-subnav-link", "header-nav-item");

    const link = document.createElement("a");
    link.classList.add("secondary-link");
    link.href = child.getAttribute("href" || "#");
    link.textContent = child.textContent;

    // Check if link should open in new tab
    if (child.getAttribute("target") === `_blank`) {
      console.log('working');
      link.target = "_blank";
      link.rel = "noopener noreferrer"; // Security best practice for _blank links
    }

    linkWrapper.appendChild(link);

    this.secondaryLinks.appendChild(linkWrapper);
  }
  buildMobileLink(child) {
    const linkWrapper = document.createElement("div");
    linkWrapper.classList.add(
      "secondary-header-menu-nav-item",
      "container",
      "header-menu-nav-item",
      "header-menu-nav-item--collection"
    );

    const link = document.createElement("a");
    link.href = child.getAttribute("href" || "#");

     // Check if link should open in new tab
    if (child.getAttribute("target") === `_blank`) {
      link.target = "_blank";
      link.rel = "noopener noreferrer"; // Security best practice for _blank links
    }

    const linkContent = document.createElement("div");
    linkContent.classList.add(
      "secondary-header-menu-nav-item-content",
      "header-menu-nav-item-content"
    );
    linkContent.textContent = child.textContent;

    link.appendChild(linkContent);
    linkWrapper.appendChild(link);

    this.mobileLinks.appendChild(linkWrapper);
  }
  buildSecondaryDropdown(child) {
    const dropdownWrapper = document.createElement("div");
    dropdownWrapper.classList.add(
      "wm-subnav-link",
      "wm-subnav-folder",
      "header-nav-item",
      "header-nav-item--folder"
    );

    const dropdownTitle = document.createElement("a");
    dropdownTitle.classList.add(
      "secondary-link",
      "secondary-nav-folder-title",
      "header-nav-folder-title"
    );
    dropdownTitle.textContent = child.querySelector(
      "SecondaryDropdownTitle"
    ).textContent;

    const folder = document.createElement("div");
    folder.classList.add(
      "secondary-folder",
      "secondary-nav-folder-content",
      "header-nav-folder-content"
    );

    const folderItems = child.querySelectorAll("SecondaryDropdownItem");
    folderItems.forEach(item => {
      const linkWrapper = document.createElement("div");
      linkWrapper.classList.add(
        "secondary-folder-item",
        "header-nav-folder-item"
      );

      const link = document.createElement("a");
      link.classList.add("secondary-link", "folder-item-link");
      link.href = item.getAttribute("href" || "#");
      link.textContent = item.textContent;

       // Check if link should open in new tab
    if (item.getAttribute("target") === `_blank`) {
      link.target = "_blank";
      link.rel = "noopener noreferrer"; // Security best practice for _blank links
    }

      linkWrapper.appendChild(link);
      folder.appendChild(linkWrapper);
    });

    dropdownWrapper.appendChild(dropdownTitle);
    dropdownWrapper.appendChild(folder);

    this.secondaryLinks.appendChild(dropdownWrapper);
  }
  buildMobileDropdown(child) {
    const dropdown = child.querySelector("SecondaryDropdownTitle");
    const dropdownHref = dropdown.getAttribute("href");

    const dropdownWrapper = document.createElement("div");
    dropdownWrapper.classList.add(
      "secondary-header-menu-nav-item",
      "container",
      "header-menu-nav-item"
    );

    const dropdownLink = document.createElement("a");
    dropdownLink.setAttribute("data-folder-id", dropdownHref);
    dropdownLink.setAttribute("href", dropdownHref);

    const dropdownLinkContent = document.createElement("div");
    dropdownLinkContent.classList.add(
      "secondary-header-menu-nav-item-content",
      "header-menu-nav-item-content"
    );

    const hiddenSpan = document.createElement("span");
    hiddenSpan.classList.add("visually-hidden");
    hiddenSpan.textContent = "Folder:";

    const contentSpan = document.createElement("span");
    contentSpan.classList.add('header-nav-folder-title-text');
    contentSpan.textContent = dropdown.textContent;

    const chevronSpan = document.createElement("span");
    chevronSpan.classList.add("chevron", "chevron--right");

    dropdownLinkContent.appendChild(hiddenSpan);
    dropdownLinkContent.appendChild(contentSpan);
    dropdownLinkContent.appendChild(chevronSpan);

    dropdownLink.appendChild(dropdownLinkContent);

    dropdownWrapper.appendChild(dropdownLink);

    this.mobileLinks.appendChild(dropdownWrapper);

    const mobileFolder = document.createElement("div");
    mobileFolder.classList.add(
      "secondary-header-menu-nav-folder",
      "header-menu-nav-folder"
    );
    mobileFolder.setAttribute("data-folder", dropdownHref);

    const mobileFolderContent = document.createElement("div");
    mobileFolderContent.classList.add(
      "secondary-header-menu-nav-folder-content",
      "header-menu-nav-folder-content"
    );

    const mobileFolderControls = document.createElement("div");
    mobileFolderControls.classList.add(
      "header-menu-controls",
      "container",
      "header-menu-nav-item"
    );

    const mobileFolderControlsLinks = document.createElement("a");
    mobileFolderControlsLinks.classList.add(
      "header-menu-controls-control",
      "header-menu-controls-control--active"
    );
    mobileFolderControlsLinks.dataset.action = "back";
    mobileFolderControlsLinks.href = "/";
    mobileFolderControlsLinks.setAttribute("tabindex", "-1");

    const controlsChevronSpan = document.createElement("span");
    controlsChevronSpan.classList.add("chevron", "chevron--left");

    const backSpan = document.createElement("span");
    backSpan.textContent = "Back";

    mobileFolderControlsLinks.appendChild(controlsChevronSpan);
    mobileFolderControlsLinks.appendChild(backSpan);

    mobileFolderControls.appendChild(mobileFolderControlsLinks);

    mobileFolderContent.appendChild(mobileFolderControls);

    const mobileFolderItems = child.querySelectorAll("SecondaryDropdownItem");
    mobileFolderItems.forEach(item => {
      const linkWrapper = document.createElement("div");
      linkWrapper.classList.add(
        "secondary-header-menu-nav-item",
        "container",
        "header-menu-nav-item"
      );

      const link = document.createElement("a");
      link.classList.add("secondary-folder-item-link");
      link.href = item.getAttribute("href" || "#");
      link.setAttribute("tab-index", "0");

       // Check if link should open in new tab
    if (child.getAttribute("target") === `_blank`) {
      link.target = "_blank";
      link.rel = "noopener noreferrer"; // Security best practice for _blank links
    }

      const linkContent = document.createElement("div");
      linkContent.classList.add(
        "secondary-header-menu-nav-item-content",
        "header-menu-nav-item-content"
      );
      linkContent.textContent = item.textContent;

      link.appendChild(linkContent);
      linkWrapper.appendChild(link);

      mobileFolderContent.appendChild(linkWrapper);

      mobileFolder.appendChild(mobileFolderContent);

      const dropzone = document.querySelector(".header-menu-nav-list");
      dropzone.insertAdjacentElement("beforeend", mobileFolder);
    });
  }
  buildSecondaryHeaderActions() {
    const headerActions = this.el.querySelectorAll(
      "SecondaryAccount, SecondarySocialIcons, SecondaryCart, SecondaryCTA"
    );
    if (!headerActions.length) return;

    Array.from(headerActions).forEach(child => {
      if (child.tagName === "SECONDARYACCOUNT") {
        this.buildAccountLink(child);
        this.buildMobileAccountLink(child);
      } else if (child.tagName === "SECONDARYSOCIALICONS") {
        this.buildSecondarySocialIcons(child);
      } else if (child.tagName === "SECONDARYCART") {
        this.buildSecondaryCart(child);
        this.buildMobileCart(child);
      } else if (child.tagName === "SECONDARYCTA") {
        this.buildSecondaryCTA(child);
        this.buildMobileCTA(child);
      }
    });

    // Build mobile CTAs after all CTAs are processed
    const mobileButtons = this.el.querySelectorAll("SECONDARYCTA");
    if (mobileButtons.length) {
      this.buildMobileCTA(mobileButtons);
    }
  }
  buildAccountLink(child) {
    const wrapper = document.createElement("div");
    wrapper.classList.add(
      "secondary-account",
      "user-accounts-link",
      "header-nav-item",
      "header-nav-item--collection",
      "customerAccountLoginDesktop",
      "loaded"
    );
    wrapper.setAttribute("data-controller", "UserAccountLink");
    wrapper.setAttribute("data-controllers-bound", "UserAccountLink");

    const link = document.createElement("a");
    link.classList.add(
      "secondary-account-link",
      "user-accounts-text-link",
      "header-nav-item"
    );
    link.href = "#";

    const span = document.createElement("span");
    span.classList.add("unauth");
    span.textContent = "Login";

    link.appendChild(span);
    wrapper.appendChild(link);
    this.secondaryHeaderActions.appendChild(wrapper);
  }
  buildMobileAccountLink(child) {
    this.mobileLoginWrapper = document.createElement("div");
    this.mobileLoginWrapper.classList.add(
      "user-accounts-link",
      "header-menu-nav-item",
      "header-nav-item--collection",
      "customerAccountLoginMobile",
      "loaded"
    );
    this.mobileLoginWrapper.style.display = "block";

    this.mobileLoginLink = document.createElement("a");
    this.mobileLoginLink.classList.add(
      "user-accounts-text-link",
      "header-nav-item"
    );

    this.mobileLoginSpan = document.createElement("span");
    this.mobileLoginSpan.classList.add("unauth");
    this.mobileLoginSpan.textContent = "Login";

    this.mobileLoginLink.appendChild(this.mobileLoginSpan);
    this.mobileLoginWrapper.appendChild(this.mobileLoginLink);
  }
  buildSecondarySocialIcons(child) {
    const socialIcons = this.el.querySelector("SecondarySocialIcons");
    if (!socialIcons) return;

    this.socialIconWrapper = document.createElement("div");
    this.socialIconWrapper.classList.add(
      "secondary-social-icons",
      "header-actions-action",
      "header-actions-action--social"
    );

    const socialIconList = this.el.querySelectorAll(
      "SecondarySocialLink"
    );
    if (!socialIconList.length) return;

    Array.from(socialIconList).forEach(child => {
      const href = child.getAttribute("href");

      if (href.includes("tiktok.com")) {
        const tiktokIcon = document.createElement("a");
        tiktokIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        tiktokIcon.href = href;
        tiktokIcon.target = "_blank";
        tiktokIcon.setAttribute("aria-label", "tiktok-unauth");

        tiktokIcon.innerHTML = `<svg viewBox="23 23 64 64">
      <use xlink:href="#tiktok-unauth-icon" width="110" height="110"></use>
    </svg>`;

        this.socialIconWrapper.appendChild(tiktokIcon);
      }
      if (href.includes("500px.com")) {
        const fivehundredpxIcon = document.createElement("a");
        fivehundredpxIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        fivehundredpxIcon.href = href;
        fivehundredpxIcon.target = "_blank";
        fivehundredpxIcon.setAttribute("aria-label", "500px");

        fivehundredpxIcon.innerHTML = `<svg viewBox="23 23 64 64">
        <use xlink:href="#fivehundredpix-unauth-icon" width="110" height="110"></use>
    </svg>`;

        this.socialIconWrapper.appendChild(fivehundredpxIcon);
      }
      if (href.includes("applepodcasts.com")) {
        const podcastIcon = document.createElement("a");
        podcastIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        podcastIcon.href = href;
        podcastIcon.target = "_blank";
        podcastIcon.setAttribute("aria-label", "Apple Podcasts");

        podcastIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#applepodcast-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(podcastIcon);
      }
      if (href.includes("bandsintown.com")) {
        const bandsintownIcon = document.createElement("a");
        bandsintownIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        bandsintownIcon.href = href;
        bandsintownIcon.target = "_blank";
        bandsintownIcon.setAttribute("aria-label", "Bandsintown");

        bandsintownIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#bandsintown-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(bandsintownIcon);
      }
      if (href.includes("behance.com")) {
        const behanceIcon = document.createElement("a");
        behanceIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        behanceIcon.href = href;
        behanceIcon.target = "_blank";
        behanceIcon.setAttribute("aria-label", "Behance");

        behanceIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#behance-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(behanceIcon);
      }
      if (href.includes("codepen.io")) {
        const codepenIcon = document.createElement("a");
        codepenIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        codepenIcon.href = href;
        codepenIcon.target = "_blank";
        codepenIcon.setAttribute("aria-label", "CodePen");

        codepenIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#codepen-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(codepenIcon);
      }
      if (href.includes("discord.com")) {
        const discordIcon = document.createElement("a");
        discordIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        discordIcon.href = href;
        discordIcon.target = "_blank";
        discordIcon.setAttribute("aria-label", "Discord");

        discordIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#discord-unauth-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(discordIcon);
      }
      if (href.includes("dribbble.com")) {
        const dribbbleIcon = document.createElement("a");
        dribbbleIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        dribbbleIcon.href = href;
        dribbbleIcon.target = "_blank";
        dribbbleIcon.setAttribute("aria-label", "Connect to Dribbble");

        dribbbleIcon.innerHTML = `<svg viewBox="23 23 64 64">
        <use xlink:href="#dribbble-icon" width="110" height="110"></use>
    </svg>`;

        this.socialIconWrapper.appendChild(dribbbleIcon);
      }
      if (href.includes("facebook.com")) {
        const facebookIcon = document.createElement("a");
        facebookIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        facebookIcon.href = href;
        facebookIcon.target = "_blank";
        facebookIcon.setAttribute("aria-label", "Facebook");

        facebookIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#facebook-unauth-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(facebookIcon);
      }
      if (href.includes("flickr.com")) {
        const flickrIcon = document.createElement("a");
        flickrIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        flickrIcon.href = href;
        flickrIcon.target = "_blank";
        flickrIcon.setAttribute("aria-label", "Flickr");

        flickrIcon.innerHTML = `<svg viewBox="23 23 64 64">
        <use xlink:href="#flickr-unauth-icon" width="110" height="110"></use>
    </svg>`;

        this.socialIconWrapper.appendChild(flickrIcon);
      }
      if (href.includes("github.com")) {
        const githubIcon = document.createElement("a");
        githubIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        githubIcon.href = href;
        githubIcon.target = "_blank";
        githubIcon.setAttribute("aria-label", "GitHub");

        githubIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#github-unauth-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(githubIcon);
      }
      if (href.includes("goodreads.com")) {
        const goodreadsIcon = document.createElement("a");
        goodreadsIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        goodreadsIcon.href = href;
        goodreadsIcon.target = "_blank";
        goodreadsIcon.setAttribute("aria-label", "Goodreads");

        goodreadsIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#goodreads-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(goodreadsIcon);
      }
      if (href.includes("play.google.com")) {
        const googlePlayIcon = document.createElement("a");
        googlePlayIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        googlePlayIcon.href = href;
        googlePlayIcon.target = "_blank";
        googlePlayIcon.setAttribute("aria-label", "Google Play");

        googlePlayIcon.innerHTML = `<svg viewBox="23 23 64 64">
        <use xlink:href="#googleplay-icon" width="110" height="110"></use>
    </svg>`;

        this.socialIconWrapper.appendChild(googlePlayIcon);
      }
      if (href.includes("houzz.com")) {
        const houzzIcon = document.createElement("a");
        houzzIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        houzzIcon.href = href;
        houzzIcon.target = "_blank";
        houzzIcon.setAttribute("aria-label", "houzz");

        houzzIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#houzz-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(houzzIcon);
      }
      if (href.includes("imdb.com")) {
        const imdbIcon = document.createElement("a");
        imdbIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        imdbIcon.href = href;
        imdbIcon.target = "_blank";
        imdbIcon.setAttribute("aria-label", "IMDb");

        imdbIcon.innerHTML = `<svg viewBox="23 23 64 64">
        <use xlink:href="#imdb-icon" width="110" height="110"></use>
    </svg>`;

        this.socialIconWrapper.appendChild(imdbIcon);
      }
      if (href.includes("instagram.com")) {
        const instagramIcon = document.createElement("a");
        instagramIcon.className =
          "secondary-social-icon icon icon--fill header-icon header-icon-border-shape-none header-icon-border-style-outline";
        instagramIcon.href = href;
        instagramIcon.target = "_blank";
        instagramIcon.setAttribute("aria-label", "Instagram");

        instagramIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#instagram-unauth-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(instagramIcon);
      }
      if (href.includes("linkedin.com")) {
        const linkedinIcon = document.createElement("a");
        linkedinIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        linkedinIcon.href = href;
        linkedinIcon.target = "_blank";
        linkedinIcon.setAttribute("aria-label", "LinkedIn");

        linkedinIcon.innerHTML = `<svg viewBox="23 23 64 64">
        <use xlink:href="#linkedin-unauth-icon" width="110" height="110"></use>
    </svg>`;

        this.socialIconWrapper.appendChild(linkedinIcon);
      }
      if (href.includes("medium.com")) {
        const mediumIcon = document.createElement("a");
        mediumIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        mediumIcon.href = href;
        mediumIcon.target = "_blank";
        mediumIcon.setAttribute("aria-label", "Medium");

        mediumIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#medium-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(mediumIcon);
      }
      if (href.includes("meetup.com")) {
        const meetupIcon = document.createElement("a");
        meetupIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        meetupIcon.href = href;
        meetupIcon.target = "_blank";
        meetupIcon.setAttribute("aria-label", "Meetup");

        meetupIcon.innerHTML = `<svg viewBox="23 23 64 64">
        <use xlink:href="#meetup-icon" width="110" height="110"></use>
    </svg>`;

        this.socialIconWrapper.appendChild(meetupIcon);
      }
      if (href.includes("pinterest.com")) {
        const pinterestIcon = document.createElement("a");
        pinterestIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        pinterestIcon.href = href;
        pinterestIcon.target = "_blank";
        pinterestIcon.setAttribute("aria-label", "Pinterest");

        pinterestIcon.innerHTML = `<svg viewBox="23 23 64 64">
        <use xlink:href="#pinterest-unauth-icon" width="110" height="110"></use>
    </svg>`;

        this.socialIconWrapper.appendChild(pinterestIcon);
      }
      if (href.includes("reddit.com")) {
        const redditIcon = document.createElement("a");
        redditIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        redditIcon.href = href;
        redditIcon.target = "_blank";
        redditIcon.setAttribute("aria-label", "reddit");

        redditIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#reddit-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(redditIcon);
      }
      if (href.includes("smugmug.com")) {
        const smugmugIcon = document.createElement("a");
        smugmugIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        smugmugIcon.href = href;
        smugmugIcon.target = "_blank";
        smugmugIcon.setAttribute("aria-label", "SmugMug");

        smugmugIcon.innerHTML = `<svg viewBox="23 23 64 64">
        <use xlink:href="#smugmug-unauth-icon" width="110" height="110"></use>
    </svg>`;

        this.socialIconWrapper.appendChild(smugmugIcon);
      }
      if (href.includes("snapchat.com")) {
        const snapchatIcon = document.createElement("a");
        snapchatIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        snapchatIcon.href = href;
        snapchatIcon.target = "_blank";
        snapchatIcon.setAttribute("aria-label", "Connect to Snapchat");

        snapchatIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#snapchat-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(snapchatIcon);
      }
      if (href.includes("soundcloud.com")) {
        const soundcloudIcon = document.createElement("a");
        soundcloudIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        soundcloudIcon.href = href;
        soundcloudIcon.target = "_blank";
        soundcloudIcon.setAttribute("aria-label", "SoundCloud");

        soundcloudIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#soundcloud-unauth-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(soundcloudIcon);
      }
      if (href.includes("spotify.com")) {
        const spotifyIcon = document.createElement("a");
        spotifyIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        spotifyIcon.href = href;
        spotifyIcon.target = "_blank";
        spotifyIcon.setAttribute("aria-label", "Spotify");

        spotifyIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#spotify-unauth-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(spotifyIcon);
      }
      if (href.includes("stitcher.com")) {
        const stitcherIcon = document.createElement("a");
        stitcherIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        stitcherIcon.href = href;
        stitcherIcon.target = "_blank";
        stitcherIcon.setAttribute("aria-label", "Stitcher");

        stitcherIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#stitcher-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(stitcherIcon);
      }
      if (href.includes("the-dots.com")) {
        const dotsIcon = document.createElement("a");
        dotsIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        dotsIcon.href = href;
        dotsIcon.target = "_blank";
        dotsIcon.setAttribute("aria-label", "The Dots");

        dotsIcon.innerHTML = `<svg viewBox="23 23 64 64">
        <use xlink:href="#thedots-icon" width="110" height="110"></use>
    </svg>`;

        this.socialIconWrapper.appendChild(dotsIcon);
      }
      if (href.includes("tidal.com")) {
        const tidalIcon = document.createElement("a");
        tidalIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        tidalIcon.href = href;
        tidalIcon.target = "_blank";
        tidalIcon.setAttribute("aria-label", "TIDAL");

        tidalIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#tidal-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(tidalIcon);
      }
      if (href.includes("threads.net")) {
        const threadsIcon = document.createElement("a");
        threadsIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        threadsIcon.href = href;
        threadsIcon.target = "_blank";
        threadsIcon.setAttribute("aria-label", "Threads");

        threadsIcon.innerHTML = `<svg viewBox="23 23 64 64">
        <use xlink:href="#threads-unauth-icon" width="110" height="110"></use>
    </svg>`;

        this.socialIconWrapper.appendChild(threadsIcon);
      }
      if (href.includes("tripadvisor.com")) {
        const tripadvisorIcon = document.createElement("a");
        tripadvisorIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        tripadvisorIcon.href = href;
        tripadvisorIcon.target = "_blank";
        tripadvisorIcon.setAttribute("aria-label", "TripAdvisor");

        tripadvisorIcon.innerHTML = `<svg viewBox="23 23 64 64">
        <use xlink:href="#tripadvisor-icon" width="110" height="110"></use>
    </svg>`;

        this.socialIconWrapper.appendChild(tripadvisorIcon);
      }
      if (href.includes("tumblr.com")) {
        const tumblrIcon = document.createElement("a");
        tumblrIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        tumblrIcon.href = href;
        tumblrIcon.target = "_blank";
        tumblrIcon.setAttribute("aria-label", "Tumblr");

        tumblrIcon.innerHTML = `<svg viewBox="23 23 64 64">
        <use xlink:href="#tumblr-unauth-icon" width="110" height="110"></use>
    </svg>`;

        this.socialIconWrapper.appendChild(tumblrIcon);
      }
      if (href.includes("twitch.com")) {
        const twitchIcon = document.createElement("a");
        twitchIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        twitchIcon.href = href;
        twitchIcon.target = "_blank";
        twitchIcon.setAttribute("aria-label", "Twitch");

        twitchIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#twitch-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(twitchIcon);
      }
      if (href.includes("vevo.com")) {
        const vevoIcon = document.createElement("a");
        vevoIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        vevoIcon.href = href;
        vevoIcon.target = "_blank";
        vevoIcon.setAttribute("aria-label", "Vevo");

        vevoIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#vevo-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(vevoIcon);
      }
      if (href.includes("vimeo.com")) {
        const vimeoIcon = document.createElement("a");
        vimeoIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        vimeoIcon.href = href;
        vimeoIcon.target = "_blank";
        vimeoIcon.setAttribute("aria-label", "Vimeo");

        vimeoIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#vimeo-unauth-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(vimeoIcon);
      }
      if (href.includes("vsco.com")) {
        const vscoIcon = document.createElement("a");
        vscoIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        vscoIcon.href = href;
        vscoIcon.target = "_blank";
        vscoIcon.setAttribute("aria-label", "VSCO");

        vscoIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#vsco-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(vscoIcon);
      }
      if (href.includes("yelp.com")) {
        const yelpIcon = document.createElement("a");
        yelpIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        yelpIcon.href = href;
        yelpIcon.target = "_blank";
        yelpIcon.setAttribute("aria-label", "Yelp");

        yelpIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#yelp-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(yelpIcon);
      }
      if (href.includes("youtube.com")) {
        const youtubeIcon = document.createElement("a");
        youtubeIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        youtubeIcon.href = href;
        youtubeIcon.target = "_blank";
        youtubeIcon.setAttribute("aria-label", "YouTube");

        youtubeIcon.innerHTML = `<svg viewBox="23 23 64 64">
        <use xlink:href="#youtube-unauth-icon" width="110" height="110"></use>
    </svg>`;

        this.socialIconWrapper.appendChild(youtubeIcon);
      }
      if (href.includes("x.com")) {
        const xIcon = document.createElement("a");
        xIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        xIcon.href = href;
        xIcon.target = "_blank";
        xIcon.setAttribute("aria-label", "X");

        xIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#x-formerly-twitter-unauth-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(xIcon);
      }
      if (href.includes("twitter.com")) {
        const twitterIcon = document.createElement("a");
        twitterIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        twitterIcon.href = href;
        twitterIcon.target = "_blank";
        twitterIcon.setAttribute("aria-label", "Twitter");

        twitterIcon.innerHTML = `<svg viewBox="23 23 64 64">
        <use xlink:href="#twitter-unauth-icon" width="110" height="110"></use>
    </svg>`;

        this.socialIconWrapper.appendChild(twitterIcon);
      }
      if (href.includes("mailto:")) {
        const emailIcon = document.createElement("a");
        emailIcon.classList.add(
          "secondary-social-icon",
          "icon",
          "icon--fill",
          "header-icon",
          "header-icon-border-shape-none",
          "header-icon-border-style-outline"
        );

        emailIcon.href = href;
        emailIcon.target = "_blank";
        emailIcon.setAttribute("aria-label", href);

        emailIcon.innerHTML = `<svg viewBox="23 23 64 64">
    <use xlink:href="#email-icon" width="110" height="110"></use>
  </svg>`;

        this.socialIconWrapper.appendChild(emailIcon);
      }
    });

    this.secondaryHeaderActions.appendChild(this.socialIconWrapper);
    this.cloneMobileSocialLinks();
  }
  cloneMobileSocialLinks() {
    this.mobileSocialLinks = this.socialIconWrapper.cloneNode(true);

    this.mobileSocialLinkWrapper = document.createElement("div");
    this.mobileSocialLinkWrapper.classList.add(
      "header-menu-actions",
      "social-accounts"
    );

    const mobileSocialIcons = this.mobileSocialLinks.querySelectorAll(
      ".secondary-social-icon"
    );
    
    mobileSocialIcons.forEach(icon => {
      icon.classList.add("mobile");
      this.mobileSocialLinkWrapper.appendChild(icon);
    });
  }
  buildSecondaryCart(child) {
    const wrapper = document.createElement("div");
    wrapper.classList.add(
      "secondary-cart",
      "header-actions-action",
      "header-actions-action--cart"
    );

    const link = document.createElement("a");
    link.href = "/cart";
    link.classList.add(
      "secondary-cart-icon",
      "cart-style-icon",
      "icon--stroke",
      "icon--fill",
      "icon--cart",
      "sqs-custom-cart",
      "header-icon",
      "show-empty-cart-state",
      "cart-quantity-zero",
      "header-icon-border-shape-none",
      "header-icon-border-style-outline"
    );

    const cartInner = document.createElement("span");
    cartInner.classList.add("Cart-inner");

    cartInner.innerHTML = `
     <svg class="icon icon--cart" width="61" height="49" viewBox="0 0 61 49">
       <path fill-rule="evenodd" clip-rule="evenodd" d="M0.5 2C0.5 1.17157 1.17157 0.5 2 0.5H13.6362C14.3878 0.5 15.0234 1.05632 15.123 1.80135L16.431 11.5916H59C59.5122 11.5916 59.989 11.8529 60.2645 12.2847C60.54 12.7165 60.5762 13.2591 60.3604 13.7236L50.182 35.632C49.9361 36.1614 49.4054 36.5 48.8217 36.5H18.0453C17.2937 36.5 16.6581 35.9437 16.5585 35.1987L12.3233 3.5H2C1.17157 3.5 0.5 2.82843 0.5 2ZM16.8319 14.5916L19.3582 33.5H47.8646L56.6491 14.5916H16.8319Z"></path>
       <path d="M18.589 35H49.7083L60 13H16L18.589 35Z"></path>
       <path d="M21 49C23.2091 49 25 47.2091 25 45C25 42.7909 23.2091 41 21 41C18.7909 41 17 42.7909 17 45C17 47.2091 18.7909 49 21 49Z"></path>
       <path d="M45 49C47.2091 49 49 47.2091 49 45C49 42.7909 47.2091 41 45 41C42.7909 41 41 42.7909 41 45C41 47.2091 42.7909 49 45 49Z"></path>
     </svg>
  
     <div class="icon-cart-quantity">
       <span class="cart-quantity-container">
         <span class="sqs-cart-quantity">0</span>
       </span>
     </div>
   `;

    link.appendChild(cartInner);
    wrapper.appendChild(link);
    this.secondaryHeaderActions.appendChild(wrapper);
  }
  buildMobileCart(child) {
    // Create main wrapper
    this.mobileCartWrapper = document.createElement("div");
    this.mobileCartWrapper.classList.add(
      "header-actions-action",
      "header-actions-action--cart"
    );

    // Create cart link
    this.mobileCartLink = document.createElement("a");
    this.mobileCartLink.href = "/cart";
    this.mobileCartLink.classList.add(
      "cart-style-icon",
      "icon--stroke",
      "icon--fill",
      "icon--cart",
      "sqs-custom-cart",
      "header-icon",
      "show-empty-cart-state",
      "cart-quantity-zero",
      "header-icon-border-shape-none",
      "header-icon-border-style-outline"
    );

    // Create Cart-inner span
    this.mobileCartInner = document.createElement("span");
    this.mobileCartInner.classList.add("Cart-inner");

    // Create SVG cart icon
    const cartSvg = `
    <svg class="icon icon--cart" width="61" height="49" viewBox="0 0 61 49">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M0.5 2C0.5 1.17157 1.17157 0.5 2 0.5H13.6362C14.3878 0.5 15.0234 1.05632 15.123 1.80135L16.431 11.5916H59C59.5122 11.5916 59.989 11.8529 60.2645 12.2847C60.54 12.7165 60.5762 13.2591 60.3604 13.7236L50.182 35.632C49.9361 36.1614 49.4054 36.5 48.8217 36.5H18.0453C17.2937 36.5 16.6581 35.9437 16.5585 35.1987L12.3233 3.5H2C1.17157 3.5 0.5 2.82843 0.5 2ZM16.8319 14.5916L19.3582 33.5H47.8646L56.6491 14.5916H16.8319Z"></path>
      <path d="M18.589 35H49.7083L60 13H16L18.589 35Z"></path>
      <path d="M21 49C23.2091 49 25 47.2091 25 45C25 42.7909 23.2091 41 21 41C18.7909 41 17 42.7909 17 45C17 47.2091 18.7909 49 21 49Z"></path>
      <path d="M45 49C47.2091 49 49 47.2091 49 45C49 42.7909 47.2091 41 45 41C42.7909 41 41 42.7909 41 45C41 47.2091 42.7909 49 45 49Z"></path>
    </svg>`;

    // Create cart quantity container
    const quantityContainer = `
    <div class="icon-cart-quantity">
      <span class="cart-quantity-container">
        <span class="sqs-cart-quantity">0</span>
      </span>
    </div>`;

    // Combine all elements
    this.mobileCartInner.innerHTML = cartSvg + quantityContainer;
    this.mobileCartLink.appendChild(this.mobileCartInner);
    this.mobileCartWrapper.appendChild(this.mobileCartLink);

    return this.mobileCartWrapper;
  }
  buildSecondaryCTA(child) {
    const buttonWrapper = document.createElement("div");
    buttonWrapper.classList.add(
      "secondary-cta",
      "header-actions-action",
      "header-actions-action--cta"
    );

    const buttonLink = document.createElement("a");
    buttonLink.classList.add(
      "secondary-btn",
      "btn",
      "btn--border",
      "theme-btn--primary-inverse",
      "sqs-button-element--primary"
    );
    buttonLink.href = child.getAttribute("href", "#");
    buttonLink.textContent = child.textContent;

     // Check if link should open in new tab
    if (child.getAttribute("target") === `_blank`) {
      buttonLink.target = "_blank";
      buttonLink.rel = "noopener noreferrer"; // Security best practice for _blank links
    }

    buttonWrapper.appendChild(buttonLink);

    this.secondaryHeaderActions.appendChild(buttonWrapper);
  }
  buildMobileCTA(mobileButtons) {
    this.mobileButtonWrapper = document.createElement("div");
    this.mobileButtonWrapper.classList.add("header-menu-cta");

    Array.from(mobileButtons).forEach(button => {
      const mobileButtonLink = document.createElement("a");
      mobileButtonLink.classList.add(
        "secondary-overlay-button",
        "theme-btn--primary",
        "btn",
        "sqs-button-element--primary"
      );
      mobileButtonLink.href = button.getAttribute("href", "#");
      mobileButtonLink.textContent = button.textContent;

       // Check if link should open in new tab
    if (button.getAttribute("target") === `_blank`) {
      mobileButtonLink.target = "_blank";
      mobileButtonLink.rel = "noopener noreferrer"; // Security best practice for _blank links
    }

      this.mobileButtonWrapper.appendChild(mobileButtonLink);
    });
  }
  setLayout() {
    // const desktopLayout = this.el.dataset.desktopLayout || "nav-right";
    const desktopLayout = this.settings.desktopLayout;

    if (desktopLayout === "nav-left") {
      this.secondaryWrapper.classList.add("header-layout-nav-left");
    } else if (desktopLayout === "nav-center") {
      this.secondaryWrapper.classList.add("header-layout-nav-center");
    } else if (desktopLayout === "nav-right") {
      this.secondaryWrapper.classList.add("header-layout-nav-right");
    } else if (desktopLayout === "branding-center") {
      this.secondaryWrapper.classList.add("header-layout-branding-center");
    } else if (desktopLayout === "nav-only") {
      this.secondaryWrapper.classList.add("header-layout-nav-only");
    }
  }
  loadSocialIcons() {
    let socialInnerHTML = `<symbol id="fivehundredpix-unauth-icon" viewBox="0 0 64 64"><path d="M22.5,37.4c0,0,0.2,0.5,0.3,0.7c0.5,1.2,1.2,2.3,2.2,3.2c0.9,0.9,2,1.7,3.2,2.2c1.3,0.5,2.6,0.8,4,0.8c1.4,0,2.7-0.3,4-0.8c1.2-0.5,2.3-1.2,3.2-2.2c0.9-0.9,1.7-2,2.2-3.2c0.5-1.3,0.8-2.6,0.8-4c0-1.4-0.3-2.7-0.8-4c-0.5-1.2-1.2-2.3-2.2-3.2s-2-1.7-3.2-2.2c-1.3-0.5-2.6-0.8-4-0.8c-1.4,0-2.8,0.3-4,0.8c-1,0.4-2.7,1.5-3.6,2.5l0,0v-8.4h14c0.5,0,0.5-0.7,0.5-1c0-0.2,0-0.9-0.5-1H23.3c-0.4,0-0.7,0.3-0.7,0.7v11.8c0,0.4,0.5,0.7,0.9,0.7c0.9,0.2,1.1-0.1,1.3-0.4l0,0c0.3-0.5,1.3-1.5,1.3-1.5c1.6-1.6,3.7-2.4,5.9-2.4c2.2,0,4.3,0.9,5.9,2.4c1.6,1.6,2.4,3.6,2.4,5.9c0,2.2-0.9,4.3-2.4,5.9c-1.5,1.5-3.7,2.4-5.9,2.4c-1.5,0-2.9-0.4-4.2-1.2l0-7.1c0-1,0.4-2,1.1-2.8c0.8-0.9,1.9-1.4,3.1-1.4c1.2,0,2.2,0.4,3,1.2c0.8,0.8,1.2,1.8,1.2,3c0,2.4-1.9,4.3-4.3,4.3c-0.5,0-1.3-0.2-1.3-0.2C30.2,38,30,38.7,30,38.9c-0.3,0.9,0.1,1,0.2,1c0.8,0.2,1.3,0.3,1.9,0.3c3.4,0,6.1-2.8,6.1-6.1c0-3.4-2.8-6.1-6.1-6.1c-1.7,0-3.2,0.6-4.4,1.8c-1.1,1.1-1.8,2.6-1.8,4l0,0c0,0.2,0,4.5,0,5.9l0,0c-0.6-0.7-1.3-1.8-1.7-2.9c-0.2-0.4-0.5-0.4-1-0.2C23,36.7,22.4,36.9,22.5,37.4L22.5,37.4z M29.7,35.7c0,0.2,0.2,0.4,0.3,0.5l0,0c0.2,0.2,0.4,0.3,0.5,0.3c0.1,0,0.2-0.1,0.3-0.1c0.1-0.1,1-1.1,1.1-1.1l1.1,1.1c0.1,0.1,0.2,0.2,0.3,0.2c0.2,0,0.4-0.1,0.6-0.3c0.5-0.5,0.2-0.7,0.1-0.8L33,34.3l1.1-1.1c0.2-0.3,0-0.6-0.2-0.8c-0.3-0.3-0.6-0.4-0.8-0.2L32,33.3l-1.1-1.1c-0.1-0.1-0.1-0.1-0.2-0.1c-0.2,0-0.3,0.1-0.5,0.3c-0.4,0.3-0.4,0.6-0.2,0.8l1.1,1.1l-1.1,1.1C29.8,35.5,29.7,35.6,29.7,35.7z M32.2,20.3c-1.8,0-3.8,0.4-5.2,1c-0.2,0.1-0.2,0.2-0.3,0.4c0,0.2,0,0.4,0.1,0.7c0.1,0.2,0.3,0.8,0.8,0.6c1.5-0.6,3.1-0.9,4.5-0.9c1.7,0,3.3,0.3,4.8,1c1.2,0.5,2.3,1.2,3.6,2.3c0.1,0.1,0.2,0.1,0.3,0.1c0.2,0,0.5-0.2,0.7-0.5c0.3-0.4,0.6-0.7,0.2-1c-1.2-1.1-2.5-2-4.1-2.6C36,20.7,34.1,20.3,32.2,20.3z M42,42.8L42,42.8c-0.2-0.2-0.4-0.3-0.6-0.4c-0.2,0-0.3,0-0.4,0.1l-0.1,0.1c-1.1,1.1-2.4,2-3.9,2.6c-1.5,0.6-3.1,1-4.8,1c-1.7,0-3.3-0.3-4.8-1c-1.5-0.6-2.8-1.5-3.9-2.6c-1.2-1.2-2.1-2.5-2.6-3.9c-0.6-1.4-0.7-2.4-0.8-2.8c0,0,0-0.1,0-0.1c-0.1-0.4-0.4-0.4-1-0.3c-0.2,0-0.9,0.1-0.8,0.6l0,0c0.2,1.1,0.5,2.2,0.9,3.3c0.7,1.7,1.7,3.2,3,4.5c1.3,1.3,2.8,2.3,4.5,3c1.7,0.7,3.6,1.1,5.5,1.1c1.9,0,3.7-0.4,5.5-1.1c1.7-0.7,3.2-1.7,4.5-3c0,0,0.1-0.1,0.1-0.1C42.5,43.6,42.6,43.3,42,42.8z"></path></symbol><symbol id="fivehundredpix-unauth-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M41.5,25c-0.2,0.2-0.4,0.5-0.7,0.5c-0.1,0-0.2,0-0.3-0.1c-1.2-1.1-2.4-1.8-3.6-2.3c-1.5-0.6-3.1-1-4.8-1c-1.5,0-3.1,0.3-4.5,0.9c-0.5,0.2-0.7-0.4-0.8-0.6c-0.1-0.3-0.2-0.5-0.1-0.7c0-0.2,0.1-0.3,0.3-0.4c1.4-0.6,3.4-1,5.2-1c1.9,0,3.7,0.4,5.5,1.1c1.6,0.7,2.9,1.5,4.1,2.6C42.1,24.4,41.9,24.7,41.5,25z M23.3,36.6c0.5-0.2,0.9-0.2,1,0.2c0.4,1.1,1,2.2,1.7,2.9l0,0c0-1.4,0-5.7,0-5.9l0,0c0-1.5,0.6-2.9,1.8-4c1.2-1.1,2.7-1.8,4.4-1.8c3.4,0,6.1,2.7,6.1,6.1c0,3.4-2.8,6.1-6.1,6.1c-0.7,0-1.2,0-1.9-0.3c-0.1,0-0.5-0.2-0.2-1c0.1-0.2,0.3-0.9,0.8-0.7c0,0,0.9,0.2,1.3,0.2c2.4,0,4.3-1.9,4.3-4.3c0-1.1-0.4-2.2-1.2-3c-0.8-0.8-1.9-1.2-3-1.2c-1.2,0-2.3,0.5-3.1,1.4c-0.7,0.8-1.1,1.8-1.1,2.8l0,7.1c1.2,0.8,2.7,1.2,4.2,1.2c2.2,0,4.4-0.9,5.9-2.4c1.6-1.6,2.4-3.6,2.4-5.9c0-2.2-0.9-4.3-2.4-5.9c-1.6-1.6-3.6-2.4-5.9-2.4c-2.2,0-4.3,0.9-5.9,2.4c0,0-1,1-1.3,1.5l0,0c-0.2,0.3-0.4,0.6-1.3,0.4c-0.4-0.1-0.9-0.4-0.9-0.7V17.7c0-0.3,0.3-0.7,0.7-0.7h15.2c0.5,0,0.5,0.7,0.5,1s0,0.9-0.5,1h-14v8.4l0,0c1-1,2.6-2.1,3.6-2.5c1.2-0.5,2.6-0.8,4-0.8c1.4,0,2.7,0.3,4,0.8c1.2,0.5,2.3,1.2,3.2,2.2c0.9,0.9,1.7,2,2.2,3.2c0.5,1.3,0.8,2.6,0.8,4c0,1.4-0.3,2.7-0.8,4c-0.5,1.2-1.2,2.3-2.2,3.2c-0.9,0.9-2,1.7-3.2,2.2c-1.3,0.5-2.6,0.8-4,0.8c-1.4,0-2.7-0.3-4-0.8c-1.2-0.5-2.3-1.2-3.2-2.2c-0.9-0.9-1.7-2-2.2-3.2c-0.1-0.2-0.3-0.7-0.3-0.7l0,0C22.4,36.9,23,36.7,23.3,36.6z M29.9,33.1c-0.2-0.2-0.1-0.4,0.2-0.8c0.2-0.2,0.4-0.3,0.5-0.3c0.1,0,0.2,0,0.2,0.1l1.1,1.1l1.1-1.1c0.2-0.2,0.5-0.1,0.8,0.2c0.2,0.2,0.4,0.5,0.2,0.8L33,34.3l1.1,1.1c0.1,0.1,0.3,0.4-0.1,0.8c-0.2,0.2-0.4,0.3-0.6,0.3c-0.1,0-0.2-0.1-0.3-0.2L32,35.3c-0.1,0.1-1.1,1.1-1.1,1.1c0,0-0.1,0.1-0.3,0.1c-0.2,0-0.4-0.1-0.5-0.3l0,0c-0.1-0.1-0.3-0.3-0.3-0.5c0-0.1,0-0.2,0.1-0.3l1.1-1.1L29.9,33.1z M42.3,43.8c0,0-0.1,0.1-0.1,0.1c-1.3,1.3-2.8,2.3-4.5,3C36,47.6,34.1,48,32.2,48c-1.9,0-3.7-0.4-5.5-1.1c-1.7-0.7-3.2-1.7-4.5-3c-1.3-1.3-2.3-2.8-3-4.5c-0.4-1-0.8-2.1-0.9-3.3l0,0c-0.1-0.5,0.6-0.6,0.8-0.6c0.5-0.1,0.9-0.1,1,0.3c0,0,0,0,0,0.1c0.1,0.3,0.2,1.4,0.8,2.8c0.6,1.4,1.5,2.7,2.6,3.9c1.1,1.1,2.4,2,3.9,2.6c1.5,0.6,3.1,1,4.8,1c1.7,0,3.3-0.3,4.8-1c1.5-0.6,2.8-1.5,3.9-2.6l0.1-0.1c0.1-0.1,0.3-0.2,0.4-0.1c0.2,0,0.3,0.2,0.6,0.4l0,0C42.6,43.3,42.5,43.6,42.3,43.8z"></path></symbol><symbol id="applepodcast-icon" viewBox="0 0 64 64"><circle cx="32" cy="29.624" r="3.128"></circle><path d="M35.276 35.851s-.358-1.848-3.309-1.848c-3.015 0-3.242 1.848-3.243 1.848-.173.117-.025 3.616.352 6.206.386 2.651.399 4.753 2.62 4.768h.607c2.222.027 2.235-2.117 2.62-4.768.378-2.59.526-6.089.353-6.206z"></path><path d="M31.558 21.608c-4.346.206-8.352 4.153-8.62 8.495-.206 3.35 1.411 6.329 3.947 8.063.169.115.4-.011.4-.216v-1.563a.329.329 0 0 0-.115-.248 7.273 7.273 0 0 1-2.463-5.661c.1-3.786 3.207-6.939 6.991-7.091a7.296 7.296 0 0 1 7.598 7.29 7.267 7.267 0 0 1-2.367 5.368.25.25 0 0 0-.082.185v1.629c0 .206.234.334.402.215a9.056 9.056 0 0 0 3.83-7.398 9.08 9.08 0 0 0-9.52-9.068z"></path><path d="M31.138 17.202c-6.831.424-12.342 6.067-12.617 12.905-.247 6.116 3.58 11.371 8.987 13.28a.241.241 0 0 0 .316-.26l-.194-1.461a.24.24 0 0 0-.146-.19c-4.207-1.76-7.172-5.894-7.204-10.731-.042-6.19 4.898-11.454 11.079-11.783 6.764-.36 12.362 5.018 12.362 11.703 0 4.85-2.949 9.008-7.15 10.79a.23.23 0 0 0-.137.174l-.252 1.486c-.03.18.145.331.317.27 5.238-1.852 8.992-6.847 8.992-12.72 0-7.736-6.512-13.95-14.353-13.463z"></path></symbol><symbol id="applepodcast-mask" viewBox="0 0 64 64"><path d="M0 0v64h64V0H0zm34.926 42.175c-.386 2.683-.399 4.852-2.622 4.825h-.608c-2.223-.015-2.236-2.142-2.622-4.825-.377-2.62-.525-6.16-.352-6.278.001-.001.228-1.87 3.245-1.87 2.953 0 3.31 1.87 3.31 1.87.174.118.026 3.658-.351 6.278zm-7.759-5.987a.334.334 0 0 1 .114.25v1.582c0 .207-.23.335-.4.218a9.197 9.197 0 0 1-3.949-8.157c.268-4.394 4.277-8.387 8.626-8.596 5.218-.25 9.527 3.954 9.527 9.176a9.194 9.194 0 0 1-3.832 7.484c-.168.121-.403-.008-.403-.217v-1.649c0-.071.03-.138.082-.187a7.39 7.39 0 0 0 2.369-5.431c0-4.178-3.433-7.546-7.603-7.376-3.787.154-6.895 3.344-6.996 7.175a7.396 7.396 0 0 0 2.465 5.728zm7.963-6.592c0 1.747-1.401 3.164-3.13 3.164s-3.13-1.417-3.13-3.164c0-1.748 1.401-3.165 3.13-3.165s3.13 1.417 3.13 3.165zm1.372 13.924c-.172.061-.348-.092-.317-.274l.252-1.504a.232.232 0 0 1 .138-.175A11.86 11.86 0 0 0 43.73 30.65c0-6.765-5.602-12.206-12.37-11.842-6.185.333-11.129 5.66-11.088 11.922.033 4.894 3 9.078 7.21 10.858.079.033.135.106.146.192l.194 1.479c.024.178-.15.323-.316.263-5.411-1.932-9.24-7.25-8.994-13.437.276-6.92 5.79-12.628 12.626-13.058C38.984 16.534 45.5 22.822 45.5 30.65c0 5.942-3.756 10.995-8.998 12.87z"></path></symbol><symbol id="bandsintown-icon" viewBox="0 0 64 64"><path d="M25.8,39.3h13.4v1.1H24.7V18h-5.6v28h25.8V33.7h-19V39.3z M31.4,24.7h-5.6v7.8h5.6V24.7z M38.2,24.7h-5.6v7.8h5.6V24.7z M39.3,18v14.6h5.6V18H39.3z"></path></symbol><symbol id="bandsintown-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M32.6,24.7h5.6v7.8h-5.6V24.7z M25.8,24.7h5.6v7.8h-5.6V24.7z M44.9,46H19.1V18h5.6v22.4h14.6 v-1.1H25.8v-5.6h19V46z M44.9,32.6h-5.6V18h5.6V32.6z"></path></symbol><symbol id="behance-icon" viewBox="0 0 64 64"><path d="M29.1,31c0.8-0.4,1.5-0.9,1.9-1.5c0.4-0.6,0.6-1.4,0.6-2.3c0-0.9-0.1-1.6-0.4-2.2 c-0.3-0.6-0.7-1.1-1.2-1.4c-0.5-0.4-1.1-0.6-1.9-0.8c-0.7-0.2-1.5-0.2-2.4-0.2H17v18.5h8.9c0.8,0,1.6-0.1,2.4-0.3 c0.8-0.2,1.5-0.5,2.1-1c0.6-0.4,1.1-1,1.5-1.7c0.4-0.7,0.5-1.5,0.5-2.4c0-1.2-0.3-2.1-0.8-3C31.1,31.9,30.2,31.3,29.1,31z  M21.1,25.7h3.8c0.4,0,0.7,0,1,0.1c0.3,0.1,0.6,0.2,0.9,0.3c0.3,0.2,0.5,0.4,0.6,0.6c0.2,0.3,0.2,0.6,0.2,1.1c0,0.8-0.2,1.3-0.7,1.7 c-0.5,0.3-1.1,0.5-1.8,0.5h-4.1V25.7z M28.2,36.7c-0.2,0.3-0.4,0.6-0.7,0.7c-0.3,0.2-0.6,0.3-1,0.4c-0.4,0.1-0.7,0.1-1.1,0.1h-4.3 v-5.1h4.4c0.9,0,1.6,0.2,2.1,0.6c0.5,0.4,0.8,1.1,0.8,2C28.4,36,28.3,36.4,28.2,36.7z M46.7,32.3c-0.2-0.9-0.6-1.8-1.2-2.5 C45,29,44.3,28.4,43.5,28c-0.8-0.4-1.8-0.7-3-0.7c-1,0-1.9,0.2-2.8,0.5c-0.8,0.4-1.6,0.9-2.2,1.5c-0.6,0.6-1.1,1.4-1.4,2.2 c-0.3,0.9-0.5,1.8-0.5,2.8c0,1,0.2,2,0.5,2.8c0.3,0.9,0.8,1.6,1.4,2.2c0.6,0.6,1.3,1.1,2.2,1.4c0.9,0.3,1.8,0.5,2.9,0.5 c1.5,0,2.8-0.3,3.9-1c1.1-0.7,1.9-1.8,2.4-3.4h-3.2c-0.1,0.4-0.4,0.8-1,1.2c-0.5,0.4-1.2,0.6-1.9,0.6c-1,0-1.8-0.3-2.4-0.8 c-0.6-0.5-0.9-1.5-0.9-2.6H47C47,34.2,47,33.2,46.7,32.3z M37.3,32.9c0-0.3,0.1-0.6,0.2-0.9c0.1-0.3,0.3-0.6,0.5-0.9 c0.2-0.3,0.5-0.5,0.9-0.7c0.4-0.2,0.9-0.3,1.5-0.3c0.9,0,1.6,0.3,2.1,0.7c0.4,0.5,0.8,1.2,0.8,2.1H37.3z M44.1,23.8h-7.5v1.8h7.5 V23.8z"></path></symbol><symbol id="behance-mask" viewBox="0 0 64 64"><path d="M40.4,30.1c-0.6,0-1.1,0.1-1.5,0.3c-0.4,0.2-0.7,0.4-0.9,0.7c-0.2,0.3-0.4,0.6-0.5,0.9c-0.1,0.3-0.2,0.6-0.2,0.9 h6c-0.1-0.9-0.4-1.6-0.8-2.1C42,30.3,41.3,30.1,40.4,30.1z M25.5,32.8h-4.4v5.1h4.3c0.4,0,0.8,0,1.1-0.1c0.4-0.1,0.7-0.2,1-0.4 c0.3-0.2,0.5-0.4,0.7-0.7c0.2-0.3,0.2-0.7,0.2-1.2c0-1-0.3-1.6-0.8-2C27.1,33,26.4,32.8,25.5,32.8z M27,29.5 c0.5-0.3,0.7-0.9,0.7-1.7c0-0.4-0.1-0.8-0.2-1.1c-0.2-0.3-0.4-0.5-0.6-0.6c-0.3-0.2-0.6-0.3-0.9-0.3c-0.3-0.1-0.7-0.1-1-0.1h-3.8 v4.3h4.1C25.9,30.1,26.5,29.9,27,29.5z M0,0v64h64V0H0z M36.6,23.8h7.5v1.8h-7.5V23.8z M31.9,38.1c-0.4,0.7-0.9,1.2-1.5,1.7 c-0.6,0.4-1.3,0.8-2.1,1c-0.8,0.2-1.6,0.3-2.4,0.3H17V22.6h8.7c0.9,0,1.7,0.1,2.4,0.2c0.7,0.2,1.3,0.4,1.9,0.8 c0.5,0.4,0.9,0.8,1.2,1.4c0.3,0.6,0.4,1.3,0.4,2.2c0,0.9-0.2,1.7-0.6,2.3c-0.4,0.6-1,1.1-1.9,1.5c1.1,0.3,2,0.9,2.5,1.7 c0.6,0.8,0.8,1.8,0.8,3C32.5,36.6,32.3,37.4,31.9,38.1z M47,35.3h-9.6c0,1.1,0.4,2.1,0.9,2.6c0.5,0.5,1.3,0.8,2.4,0.8 c0.7,0,1.4-0.2,1.9-0.6c0.5-0.4,0.9-0.8,1-1.2h3.2c-0.5,1.6-1.3,2.8-2.4,3.4c-1.1,0.7-2.4,1-3.9,1c-1.1,0-2-0.2-2.9-0.5 c-0.8-0.3-1.6-0.8-2.2-1.4c-0.6-0.6-1-1.4-1.4-2.2c-0.3-0.9-0.5-1.8-0.5-2.8c0-1,0.2-1.9,0.5-2.8c0.3-0.9,0.8-1.6,1.4-2.2 c0.6-0.6,1.3-1.1,2.2-1.5c0.8-0.4,1.8-0.5,2.8-0.5c1.1,0,2.1,0.2,3,0.7c0.8,0.4,1.5,1,2.1,1.8c0.5,0.7,0.9,1.6,1.2,2.5 C47,33.2,47,34.2,47,35.3z"></path></symbol><symbol id="codepen-icon" viewBox="0 0 64 64"><path d="M19.7,36.9l10.9,7.2v-6.5l-6-4L19.7,36.9z M18.7,29.8v4.4l3.4-2.2L18.7,29.8z M30.6,26.4v-6.5 l-10.9,7.2l4.9,3.2L30.6,26.4z M44.3,27.1l-10.9-7.2v6.5l6,4L44.3,27.1z M32,28.8L27.1,32l4.9,3.2l4.9-3.2L32,28.8z M48,37 c0,0.5-0.2,0.9-0.6,1.1l-14.6,9.6c-0.5,0.3-1,0.3-1.5,0l-14.6-9.6C16.2,37.9,16,37.4,16,37V27c0-0.5,0.2-0.9,0.6-1.1l14.6-9.6 c0.5-0.3,1-0.3,1.5,0l14.6,9.6c0.4,0.3,0.6,0.7,0.6,1.1V37z M33.4,37.6v6.5l10.9-7.2l-4.9-3.2L33.4,37.6z M45.3,34.2v-4.4L41.9,32 L45.3,34.2z"></path></symbol><symbol id="codepen-mask" viewBox="0 0 64 64"><path d="M18.7,29.8v4.4l3.4-2.2L18.7,29.8z M19.7,36.9l10.9,7.2v-6.5l-6-4L19.7,36.9z M44.3,27.1l-10.9-7.2v6.5l6,4 L44.3,27.1z M30.6,26.4v-6.5l-10.9,7.2l4.9,3.2L30.6,26.4z M32,28.8L27.1,32l4.9,3.2l4.9-3.2L32,28.8z M0,0v64h64V0H0z M48,37 c0,0.5-0.2,0.9-0.6,1.1l-14.6,9.6c-0.5,0.3-1,0.3-1.5,0l-14.6-9.6C16.2,37.9,16,37.4,16,37V27c0-0.5,0.2-0.9,0.6-1.1l14.6-9.6 c0.5-0.3,1-0.3,1.5,0l14.6,9.6c0.4,0.3,0.6,0.7,0.6,1.1V37z M45.3,34.2v-4.4L41.9,32L45.3,34.2z M33.4,37.6v6.5l10.9-7.2l-4.9-3.2 L33.4,37.6z"></path></symbol><symbol id="discord-unauth-icon" viewBox="0 0 64 64"><path d="M42.3963 22.8955C40.4842 22.0182 38.4337 21.3718 36.2899 21.0016C36.2508 20.9944 36.2118 21.0123 36.1917 21.048C35.928 21.517 35.6359 22.1289 35.4314 22.6098C33.1255 22.2646 30.8315 22.2646 28.5729 22.6098C28.3683 22.1182 28.0656 21.517 27.8007 21.048C27.7806 21.0135 27.7416 20.9956 27.7026 21.0016C25.5599 21.3706 23.5095 22.017 21.5962 22.8955C21.5796 22.9027 21.5654 22.9146 21.556 22.93C17.6667 28.7405 16.6013 34.4081 17.124 40.0055C17.1263 40.0329 17.1417 40.0591 17.163 40.0757C19.729 41.9601 22.2146 43.1041 24.6541 43.8624C24.6931 43.8743 24.7345 43.8601 24.7594 43.8279C25.3364 43.0399 25.8508 42.209 26.2918 41.3352C26.3179 41.284 26.293 41.2233 26.2398 41.203C25.4239 40.8935 24.647 40.5162 23.8997 40.0876C23.8405 40.0531 23.8358 39.9686 23.8902 39.9281C24.0475 39.8102 24.2048 39.6876 24.3549 39.5638C24.3821 39.5412 24.42 39.5364 24.4519 39.5507C29.3616 41.7923 34.6769 41.7923 39.5287 39.5507C39.5606 39.5352 39.5985 39.54 39.6268 39.5626C39.7771 39.6864 39.9343 39.8102 40.0928 39.9281C40.1472 39.9686 40.1436 40.0531 40.0845 40.0876C39.3372 40.5245 38.5602 40.8935 37.7431 41.2019C37.6899 41.2221 37.6663 41.284 37.6923 41.3352C38.1428 42.2077 38.6572 43.0387 39.2236 43.8267C39.2473 43.8601 39.2898 43.8743 39.3289 43.8624C41.7802 43.1041 44.2658 41.9601 46.8318 40.0757C46.8543 40.0591 46.8685 40.0341 46.8708 40.0067C47.4964 33.5355 45.8231 27.9143 42.4353 22.9312C42.427 22.9146 42.4128 22.9027 42.3963 22.8955ZM27.025 36.5973C25.5469 36.5973 24.3289 35.2402 24.3289 33.5736C24.3289 31.907 25.5233 30.55 27.025 30.55C28.5386 30.55 29.7448 31.9189 29.7211 33.5736C29.7211 35.2402 28.5268 36.5973 27.025 36.5973ZM36.9934 36.5973C35.5153 36.5973 34.2974 35.2402 34.2974 33.5736C34.2974 31.907 35.4917 30.55 36.9934 30.55C38.507 30.55 39.7132 31.9189 39.6895 33.5736C39.6895 35.2402 38.507 36.5973 36.9934 36.5973Z"></path></symbol><symbol id="discord-unauth-mask" viewBox="0 0 64 64"><path fill-rule="evenodd" clip-rule="evenodd" d="M64 0H0V64H64V0ZM36.23 20.0021C36.42 20.0021 40.8 20.3921 43.57 22.6221C45.07 24.0021 48 31.9321 47.98 38.7821C47.9812 38.9047 47.9501 39.0253 47.89 39.1321C45.87 42.6521 40.35 43.6521 39.09 43.6521C38.9798 43.6529 38.8709 43.628 38.772 43.5794C38.673 43.5308 38.5868 43.4598 38.52 43.3721L37.25 41.6221C39.1718 41.1872 40.9765 40.3412 42.54 39.1421C42.6637 39.0161 42.7351 38.8481 42.7401 38.6716C42.7451 38.4951 42.6832 38.3233 42.5669 38.1905C42.4506 38.0578 42.2884 37.9738 42.1128 37.9556C41.9372 37.9373 41.7612 37.9861 41.62 38.0921C41.59 38.1221 38.35 40.8721 32 40.8721C25.65 40.8721 22.36 38.0921 22.36 38.0921C22.2189 37.9861 22.0429 37.9373 21.8673 37.9556C21.6917 37.9738 21.5295 38.0578 21.4132 38.1905C21.2968 38.3233 21.2349 38.4951 21.2399 38.6716C21.2449 38.8481 21.3164 39.0161 21.44 39.1421C23.0035 40.3412 24.8083 41.1872 26.73 41.6221L25.46 43.3721C25.3933 43.4598 25.307 43.5308 25.2081 43.5794C25.1091 43.628 25.0003 43.6529 24.89 43.6521C23.63 43.6121 18.09 42.6821 16.09 39.1321C16.0299 39.0253 15.9989 38.9047 16 38.7821C16 31.9321 18.93 24.0021 20.4 22.6521C23.2 20.3921 27.58 20.0021 27.77 20.0021C27.9146 19.9908 28.0591 20.0252 28.1829 20.1006C28.3068 20.176 28.4037 20.2885 28.46 20.4221C28.5436 20.6103 28.6138 20.8041 28.67 21.0021C26.4824 21.3233 24.3773 22.0635 22.47 23.1821C22.3885 23.232 22.3178 23.2979 22.2623 23.3757C22.2068 23.4536 22.1676 23.5419 22.1471 23.6353C22.1265 23.7287 22.125 23.8252 22.1427 23.9192C22.1604 24.0132 22.1969 24.1026 22.25 24.1821C22.2981 24.2656 22.3628 24.3383 22.4402 24.3956C22.5176 24.4529 22.606 24.4936 22.6999 24.5152C22.7937 24.5368 22.891 24.5388 22.9857 24.5211C23.0804 24.5033 23.1704 24.4662 23.25 24.4121C25.9097 22.9176 28.9092 22.1326 31.96 22.1326C35.0108 22.1326 38.0103 22.9176 40.67 24.4121C40.7497 24.4662 40.8397 24.5033 40.9344 24.5211C41.029 24.5388 41.1263 24.5368 41.2202 24.5152C41.3141 24.4936 41.4025 24.4529 41.4799 24.3956C41.5573 24.3383 41.622 24.2656 41.67 24.1821C41.7231 24.1026 41.7596 24.0132 41.7773 23.9192C41.795 23.8252 41.7935 23.7287 41.773 23.6353C41.7525 23.5419 41.7133 23.4536 41.6578 23.3757C41.6023 23.2979 41.5316 23.232 41.45 23.1821C39.5679 22.0696 37.4907 21.3263 35.33 20.9921C35.3895 20.7952 35.4596 20.6015 35.54 20.4121C35.5991 20.2813 35.697 20.1718 35.8204 20.0984C35.9439 20.0251 36.0869 19.9915 36.23 20.0021ZM26.4843 35.7456C26.7961 35.8958 27.1345 35.983 27.48 36.0021C28.1619 35.9409 28.793 35.6163 29.2392 35.0972C29.6855 34.5781 29.9118 33.9054 29.87 33.2221C29.9141 32.5308 29.6836 31.85 29.2286 31.3276C28.7736 30.8052 28.1309 30.4834 27.44 30.4321C26.7474 30.4809 26.1021 30.8016 25.645 31.3243C25.1879 31.8469 24.9561 32.5292 25 33.2221C24.9798 33.5676 25.0279 33.9137 25.1416 34.2406C25.2554 34.5675 25.4326 34.8687 25.6629 35.1269C25.8933 35.3852 26.1724 35.5955 26.4843 35.7456ZM34.6952 35.1102C35.1499 35.6304 35.791 35.9508 36.48 36.0021H36.52C36.8656 35.983 37.204 35.8958 37.5158 35.7456C37.8276 35.5955 38.1067 35.3852 38.3371 35.1269C38.5675 34.8687 38.7447 34.5675 38.8584 34.2406C38.9722 33.9137 39.0203 33.5676 39 33.2221C39.0216 32.8726 38.9732 32.5223 38.8576 32.1917C38.742 31.8612 38.5615 31.5571 38.3268 31.2972C38.092 31.0373 37.8078 30.8269 37.4907 30.6784C37.1735 30.5298 36.8299 30.4461 36.48 30.4321C35.7892 30.4834 35.1465 30.8052 34.6915 31.3276C34.2365 31.85 34.006 32.5308 34.05 33.2221C34.0087 33.9118 34.2405 34.59 34.6952 35.1102Z"></path></symbol><symbol id="dribbble-icon" viewBox="0 0 64 64"><path d="M32,48c-8.8,0-16-7.2-16-16s7.2-16,16-16 s16,7.2,16,16S40.8,48,32,48z M45.5,34.2C45,34,41.3,32.9,37,33.6c1.8,4.9,2.5,8.9,2.7,9.7C42.7,41.3,44.9,38,45.5,34.2z M37.3,44.6 c-0.2-1.2-1-5.4-2.9-10.4c0,0-0.1,0-0.1,0c-7.7,2.7-10.5,8-10.7,8.5c2.3,1.8,5.2,2.9,8.4,2.9C33.9,45.7,35.7,45.3,37.3,44.6z  M21.8,41.2c0.3-0.5,4.1-6.7,11.1-9c0.2-0.1,0.4-0.1,0.5-0.2c-0.3-0.8-0.7-1.6-1.1-2.3c-6.8,2-13.4,2-14,1.9c0,0.1,0,0.3,0,0.4 C18.3,35.5,19.7,38.7,21.8,41.2z M18.6,29.2c0.6,0,6.2,0,12.6-1.7c-2.3-4-4.7-7.4-5.1-7.9C22.4,21.5,19.5,25,18.6,29.2z M28.8,18.7 c0.4,0.5,2.9,3.9,5.1,8c4.9-1.8,6.9-4.6,7.2-4.9c-2.4-2.1-5.6-3.4-9.1-3.4C30.9,18.4,29.8,18.5,28.8,18.7z M42.6,23.4 c-0.3,0.4-2.6,3.3-7.6,5.4c0.3,0.7,0.6,1.3,0.9,2c0.1,0.2,0.2,0.5,0.3,0.7c4.5-0.6,9.1,0.3,9.5,0.4C45.6,28.7,44.5,25.7,42.6,23.4z"></path></symbol><symbol id="dribbble-mask" viewBox="0 0 64 64"><path d="M34.3,34.3c-7.7,2.7-10.5,8-10.7,8.5c2.3,1.8,5.2,2.9,8.4,2.9c1.9,0,3.7-0.4,5.3-1.1 C37.1,43.4,36.3,39.2,34.3,34.3C34.4,34.2,34.4,34.3,34.3,34.3z M31.3,27.6c-2.3-4-4.7-7.4-5.1-7.9c-3.8,1.8-6.7,5.3-7.6,9.6 C19.2,29.2,24.9,29.3,31.3,27.6z M33,32.1c0.2-0.1,0.4-0.1,0.5-0.2c-0.3-0.8-0.7-1.6-1.1-2.3c-6.8,2-13.4,2-14,1.9 c0,0.1,0,0.3,0,0.4c0,3.5,1.3,6.7,3.5,9.1C22.2,40.6,25.9,34.4,33,32.1z M41.1,21.8c-2.4-2.1-5.6-3.4-9.1-3.4 c-1.1,0-2.2,0.1-3.2,0.4c0.4,0.5,2.9,3.9,5.1,8C38.8,24.9,40.8,22.1,41.1,21.8z M34.9,28.8c0.3,0.7,0.6,1.3,0.9,2 c0.1,0.2,0.2,0.5,0.3,0.7c4.5-0.6,9.1,0.3,9.5,0.4c0-3.2-1.2-6.2-3.1-8.5C42.3,23.8,40,26.7,34.9,28.8z M37,33.6 c1.8,4.9,2.5,8.9,2.7,9.7c3.1-2.1,5.2-5.4,5.9-9.2C45,34,41.3,32.9,37,33.6z M0,0v64h64V0H0z M32,48c-8.8,0-16-7.2-16-16 s7.2-16,16-16s16,7.2,16,16S40.8,48,32,48z"></path></symbol><symbol id="facebook-unauth-icon" viewBox="0 0 64 64"><path d="M34.1,47V33.3h4.6l0.7-5.3h-5.3v-3.4c0-1.5,0.4-2.6,2.6-2.6l2.8,0v-4.8c-0.5-0.1-2.2-0.2-4.1-0.2 c-4.1,0-6.9,2.5-6.9,7V28H24v5.3h4.6V47H34.1z"></path></symbol><symbol id="facebook-unauth-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M39.6,22l-2.8,0c-2.2,0-2.6,1.1-2.6,2.6V28h5.3l-0.7,5.3h-4.6V47h-5.5V33.3H24V28h4.6V24 c0-4.6,2.8-7,6.9-7c2,0,3.6,0.1,4.1,0.2V22z"></path></symbol><symbol id="flickr-unauth-icon" viewBox="0 0 64 64"><path d="M32,16c-8.8,0-16,7.2-16,16s7.2,16,16,16s16-7.2,16-16S40.8,16,32,16z M26,37c-2.8,0-5-2.2-5-5 s2.2-5,5-5s5,2.2,5,5S28.8,37,26,37z M38,37c-2.8,0-5-2.2-5-5s2.2-5,5-5s5,2.2,5,5S40.8,37,38,37z"></path></symbol><symbol id="flickr-unauth-mask" viewBox="0 0 64 64"><path d="M38,27c-2.8,0-5,2.2-5,5s2.2,5,5,5s5-2.2,5-5S40.8,27,38,27z M0,0v64h64V0H0z M32,48c-8.8,0-16-7.2-16-16 s7.2-16,16-16s16,7.2,16,16S40.8,48,32,48z M26,27c-2.8,0-5,2.2-5,5s2.2,5,5,5s5-2.2,5-5S28.8,27,26,27z"></path></symbol><symbol id="github-unauth-icon" viewBox="0 0 64 64"><path d="M32,16c-8.8,0-16,7.2-16,16c0,7.1,4.6,13.1,10.9,15.2 c0.8,0.1,1.1-0.3,1.1-0.8c0-0.4,0-1.4,0-2.7c-4.5,1-5.4-2.1-5.4-2.1c-0.7-1.8-1.8-2.3-1.8-2.3c-1.5-1,0.1-1,0.1-1 c1.6,0.1,2.5,1.6,2.5,1.6c1.4,2.4,3.7,1.7,4.7,1.3c0.1-1,0.6-1.7,1-2.1c-3.6-0.4-7.3-1.8-7.3-7.9c0-1.7,0.6-3.2,1.6-4.3 c-0.2-0.4-0.7-2,0.2-4.2c0,0,1.3-0.4,4.4,1.6c1.3-0.4,2.6-0.5,4-0.5c1.4,0,2.7,0.2,4,0.5c3.1-2.1,4.4-1.6,4.4-1.6 c0.9,2.2,0.3,3.8,0.2,4.2c1,1.1,1.6,2.5,1.6,4.3c0,6.1-3.7,7.5-7.3,7.9c0.6,0.5,1.1,1.5,1.1,3c0,2.1,0,3.9,0,4.4 c0,0.4,0.3,0.9,1.1,0.8C43.4,45.1,48,39.1,48,32C48,23.2,40.8,16,32,16z"></path></symbol><symbol id="github-unauth-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M37.1,47.2c-0.8,0.2-1.1-0.3-1.1-0.8c0-0.5,0-2.3,0-4.4c0-1.5-0.5-2.5-1.1-3 c3.6-0.4,7.3-1.7,7.3-7.9c0-1.7-0.6-3.2-1.6-4.3c0.2-0.4,0.7-2-0.2-4.2c0,0-1.3-0.4-4.4,1.6c-1.3-0.4-2.6-0.5-4-0.5 c-1.4,0-2.7,0.2-4,0.5c-3.1-2.1-4.4-1.6-4.4-1.6c-0.9,2.2-0.3,3.8-0.2,4.2c-1,1.1-1.6,2.5-1.6,4.3c0,6.1,3.7,7.5,7.3,7.9 c-0.5,0.4-0.9,1.1-1,2.1c-0.9,0.4-3.2,1.1-4.7-1.3c0,0-0.8-1.5-2.5-1.6c0,0-1.6,0-0.1,1c0,0,1,0.5,1.8,2.3c0,0,0.9,3.1,5.4,2.1 c0,1.3,0,2.3,0,2.7c0,0.4-0.3,0.9-1.1,0.8C20.6,45.1,16,39.1,16,32c0-8.8,7.2-16,16-16c8.8,0,16,7.2,16,16 C48,39.1,43.4,45.1,37.1,47.2z"></path></symbol><symbol id="goodreads-icon" viewBox="0 0 64 64"><g class="svg-icon"><path d="M38.776,45.439C37.204,47.146,34.738,48,31.378,48c-0.976,0-1.972-0.109-2.988-0.325c-1.016-0.217-1.938-0.569-2.764-1.057c-0.827-0.488-1.511-1.125-2.053-1.911c-0.542-0.786-0.84-1.748-0.894-2.886h3.455c0.027,0.623,0.223,1.152,0.589,1.585c0.366,0.433,0.813,0.785,1.342,1.057c0.529,0.271,1.104,0.468,1.727,0.59c0.623,0.122,1.219,0.183,1.789,0.183c1.138,0,2.1-0.197,2.886-0.59c0.786-0.393,1.436-0.935,1.951-1.626c0.514-0.691,0.888-1.524,1.118-2.5c0.23-0.976,0.345-2.046,0.345-3.211v-1.382h-0.081c-0.597,1.301-1.498,2.256-2.703,2.866c-1.206,0.61-2.486,0.915-3.841,0.915c-1.572,0-2.941-0.285-4.106-0.854c-1.165-0.569-2.141-1.334-2.927-2.297c-0.787-0.962-1.376-2.086-1.768-3.374c-0.393-1.287-0.59-2.649-0.59-4.085c0-1.246,0.163-2.527,0.488-3.842c0.325-1.314,0.867-2.506,1.626-3.577c0.758-1.07,1.761-1.951,3.008-2.642C28.234,18.345,29.765,18,31.581,18c1.328,0,2.547,0.291,3.658,0.874c1.111,0.583,1.978,1.457,2.602,2.622h0.04v-3.008h3.252v19.228C41.134,41.157,40.348,43.732,38.776,45.439z M34.366,35.988c0.799-0.474,1.443-1.097,1.931-1.87c0.488-0.772,0.847-1.646,1.077-2.622s0.346-1.951,0.346-2.927c0-0.921-0.109-1.829-0.326-2.724c-0.217-0.894-0.563-1.7-1.037-2.419c-0.474-0.718-1.091-1.294-1.849-1.728c-0.759-0.433-1.681-0.65-2.764-0.65c-1.112,0-2.06,0.21-2.846,0.63c-0.786,0.421-1.43,0.983-1.931,1.687c-0.501,0.705-0.868,1.518-1.097,2.439c-0.231,0.922-0.345,1.884-0.345,2.886c0,0.949,0.095,1.897,0.284,2.845c0.189,0.949,0.515,1.809,0.976,2.581c0.46,0.772,1.07,1.396,1.829,1.87c0.759,0.475,1.708,0.711,2.846,0.711S33.566,36.462,34.366,35.988z"></path></g></symbol><symbol id="goodreads-mask" viewBox="0 0 64 64"><g class="svg-mask"><path d="M36.358,23.427c-0.474-0.718-1.091-1.294-1.849-1.728c-0.759-0.433-1.681-0.65-2.764-0.65c-1.112,0-2.06,0.21-2.846,0.63c-0.786,0.421-1.43,0.983-1.931,1.687c-0.501,0.705-0.868,1.518-1.097,2.439c-0.231,0.922-0.345,1.884-0.345,2.886c0,0.949,0.095,1.897,0.284,2.846c0.189,0.949,0.515,1.809,0.976,2.581c0.461,0.772,1.07,1.396,1.829,1.87c0.759,0.475,1.708,0.711,2.846,0.711c1.138,0,2.107-0.237,2.906-0.711c0.799-0.474,1.443-1.097,1.931-1.87s0.847-1.646,1.077-2.622c0.23-0.976,0.346-1.951,0.346-2.927c0-0.921-0.109-1.829-0.326-2.724C37.177,24.951,36.832,24.145,36.358,23.427z M0,0v64h64V0H0z M41.134,37.715c0,3.441-0.787,6.016-2.358,7.724C37.204,47.146,34.738,48,31.378,48c-0.976,0-1.972-0.109-2.988-0.325c-1.016-0.217-1.938-0.569-2.764-1.057c-0.827-0.488-1.511-1.125-2.053-1.911c-0.542-0.786-0.84-1.748-0.894-2.886h3.455c0.027,0.623,0.223,1.152,0.589,1.585c0.366,0.433,0.813,0.785,1.342,1.057c0.529,0.271,1.104,0.468,1.727,0.59c0.623,0.122,1.219,0.183,1.789,0.183c1.138,0,2.1-0.197,2.886-0.59c0.786-0.393,1.437-0.935,1.951-1.626c0.514-0.691,0.888-1.524,1.118-2.5c0.23-0.976,0.345-2.046,0.345-3.211v-1.382h-0.081c-0.597,1.301-1.498,2.256-2.703,2.866c-1.206,0.61-2.486,0.915-3.841,0.915c-1.572,0-2.941-0.285-4.106-0.854c-1.165-0.569-2.141-1.334-2.927-2.297c-0.787-0.962-1.376-2.086-1.768-3.374c-0.393-1.287-0.59-2.649-0.59-4.086c0-1.246,0.163-2.527,0.488-3.842c0.325-1.314,0.867-2.506,1.626-3.577c0.758-1.07,1.761-1.951,3.008-2.642C28.234,18.345,29.766,18,31.581,18c1.328,0,2.547,0.292,3.658,0.874c1.111,0.583,1.978,1.457,2.602,2.622h0.04v-3.008h3.252V37.715z"></path></g></symbol><symbol id="googleplay-icon" viewBox="0 0 64 64"><path d="M24.4,45.6l16-8.8l-3.6-3.6L24.4,45.6z M22.2,18.5c-0.1,0.2-0.2,0.5-0.2,0.9v25.1 c0,0.4,0.1,0.6,0.2,0.9L35.6,32L22.2,18.5z M47.1,30.8L42.1,28L38.1,32l4,4l5-2.8C48.3,32.5,48.3,31.4,47.1,30.8z M40.4,27.1 l-15.9-8.8l12.3,12.3L40.4,27.1z"></path></symbol><symbol id="googleplay-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M40.4,27.1l-3.6,3.6L24.5,18.4L40.4,27.1z M22,44.5V19.4c0-0.4,0.1-0.7,0.2-0.9L35.6,32 L22.2,45.4C22.1,45.2,22,44.9,22,44.5z M24.4,45.6l12.4-12.4l3.6,3.6L24.4,45.6z M47.1,33.2l-5,2.8l-4-4l3.9-3.9l5.1,2.8 C48.3,31.4,48.3,32.5,47.1,33.2z"></path></symbol><symbol id="houzz-icon" viewBox="0 0 64 64"><path d="M23,42.4l9-5.2L23,32l9-5.2v20.8l9-5.2V21.6l-9,5.2c0,0,0-10.4,0-10.4l-9,5.2V42.4z"></path></symbol><symbol id="houzz-mask" viewBox="0 0 64 64"><path d="M23,32l9,5.2V26.8L23,32z M0,0v64h64V0H0z M41,42.4l-9,5.2V37.2l-9,5.2V21.6l9-5.2c0,0,0,10.4,0,10.4l9-5.2V42.4z"></path></symbol><symbol id="imdb-icon" viewBox="0 0 64 64"><g class="svg-icon"><path d="M43.91,20H20.09C17.831,20,16,21.831,16,24.09v14.82c0,2.259,1.831,4.09,4.09,4.09h23.82c2.259,0,4.09-1.831,4.09-4.09V24.09C48,21.831,46.169,20,43.91,20z M46,38.91c0,1.152-0.938,2.09-2.09,2.09H20.09C18.938,41,18,40.062,18,38.91V24.09c0-1.152,0.938-2.09,2.09-2.09h23.82c1.152,0,2.09,0.938,2.09,2.09V38.91z M20,35h1.337v-7.999H20V35z M26.321,30.669l-2.057-3.668h-1.382V35h1.291v-5.645l2.114,3.691h0.035l2.126-3.702V35h1.313v-7.999h-1.406L26.321,30.669zM33.751,27.001h-2.446V35h2.446c2.285,0,3.794-1.611,3.794-3.954v-0.103C37.545,28.6,36.037,27.001,33.751,27.001z M36.174,31.035c0,1.725-0.982,2.754-2.433,2.754h-1.109v-5.588h1.109c1.452,0,2.433,1.062,2.433,2.777V31.035z M41.646,28.829c-0.857,0-1.394,0.503-1.771,1.086v-3.166h-1.291V35h1.291v-0.914c0.366,0.525,0.903,1.028,1.771,1.028c1.223,0,2.354-1.017,2.354-3.074v-0.148C44,29.846,42.857,28.829,41.646,28.829z M42.698,32.029c0,1.211-0.618,1.942-1.406,1.942c-0.777,0-1.44-0.754-1.44-1.942v-0.114c0-1.189,0.663-1.943,1.44-1.943c0.777,0,1.406,0.743,1.406,1.954V32.029z"></path></g></symbol><symbol id="imdb-mask" viewBox="0 0 64 64"><g class="svg-mask"><path d="M33.74,28.201h-1.109v5.588h1.109c1.452,0,2.433-1.029,2.433-2.754v-0.057C36.174,29.263,35.192,28.201,33.74,28.201z M41.292,29.972c-0.777,0-1.44,0.754-1.44,1.943v0.114c0,1.188,0.663,1.942,1.44,1.942c0.788,0,1.406-0.731,1.406-1.942v-0.103C42.698,30.715,42.069,29.972,41.292,29.972z M43.91,22H20.09C18.938,22,18,22.938,18,24.09v14.82c0,1.152,0.938,2.09,2.09,2.09h23.82c1.152,0,2.09-0.938,2.09-2.09V24.09C46,22.938,45.062,22,43.91,22z M21.337,35H20v-7.999h1.337V35z M29.761,35h-1.313v-5.656l-2.126,3.702h-0.035l-2.114-3.691V35h-1.291v-7.999h1.382l2.057,3.668l2.034-3.668h1.406V35zM37.545,31.046c0,2.343-1.508,3.954-3.794,3.954h-2.446v-7.999h2.446c2.285,0,3.794,1.6,3.794,3.942V31.046z M44,32.04c0,2.057-1.131,3.074-2.354,3.074c-0.868,0-1.405-0.503-1.771-1.028V35h-1.291v-8.251h1.291v3.166c0.377-0.583,0.914-1.086,1.771-1.086c1.211,0,2.354,1.017,2.354,3.063V32.04z M0,0v64h64V0H0z M48,38.91c0,2.259-1.831,4.09-4.09,4.09H20.09C17.831,43,16,41.169,16,38.91V24.09c0-2.259,1.831-4.09,4.09-4.09h23.82c2.259,0,4.09,1.831,4.09,4.09V38.91z"></path></g></symbol><symbol id="instagram-unauth-icon" viewBox="0 0 64 64"><path d="M46.91,25.816c-0.073-1.597-0.326-2.687-0.697-3.641c-0.383-0.986-0.896-1.823-1.73-2.657c-0.834-0.834-1.67-1.347-2.657-1.73c-0.954-0.371-2.045-0.624-3.641-0.697C36.585,17.017,36.074,17,32,17s-4.585,0.017-6.184,0.09c-1.597,0.073-2.687,0.326-3.641,0.697c-0.986,0.383-1.823,0.896-2.657,1.73c-0.834,0.834-1.347,1.67-1.73,2.657c-0.371,0.954-0.624,2.045-0.697,3.641C17.017,27.415,17,27.926,17,32c0,4.074,0.017,4.585,0.09,6.184c0.073,1.597,0.326,2.687,0.697,3.641c0.383,0.986,0.896,1.823,1.73,2.657c0.834,0.834,1.67,1.347,2.657,1.73c0.954,0.371,2.045,0.624,3.641,0.697C27.415,46.983,27.926,47,32,47s4.585-0.017,6.184-0.09c1.597-0.073,2.687-0.326,3.641-0.697c0.986-0.383,1.823-0.896,2.657-1.73c0.834-0.834,1.347-1.67,1.73-2.657c0.371-0.954,0.624-2.045,0.697-3.641C46.983,36.585,47,36.074,47,32S46.983,27.415,46.91,25.816z M44.21,38.061c-0.067,1.462-0.311,2.257-0.516,2.785c-0.272,0.7-0.597,1.2-1.122,1.725c-0.525,0.525-1.025,0.85-1.725,1.122c-0.529,0.205-1.323,0.45-2.785,0.516c-1.581,0.072-2.056,0.087-6.061,0.087s-4.48-0.015-6.061-0.087c-1.462-0.067-2.257-0.311-2.785-0.516c-0.7-0.272-1.2-0.597-1.725-1.122c-0.525-0.525-0.85-1.025-1.122-1.725c-0.205-0.529-0.45-1.323-0.516-2.785c-0.072-1.582-0.087-2.056-0.087-6.061s0.015-4.48,0.087-6.061c0.067-1.462,0.311-2.257,0.516-2.785c0.272-0.7,0.597-1.2,1.122-1.725c0.525-0.525,1.025-0.85,1.725-1.122c0.529-0.205,1.323-0.45,2.785-0.516c1.582-0.072,2.056-0.087,6.061-0.087s4.48,0.015,6.061,0.087c1.462,0.067,2.257,0.311,2.785,0.516c0.7,0.272,1.2,0.597,1.725,1.122c0.525,0.525,0.85,1.025,1.122,1.725c0.205,0.529,0.45,1.323,0.516,2.785c0.072,1.582,0.087,2.056,0.087,6.061S44.282,36.48,44.21,38.061z M32,24.297c-4.254,0-7.703,3.449-7.703,7.703c0,4.254,3.449,7.703,7.703,7.703c4.254,0,7.703-3.449,7.703-7.703C39.703,27.746,36.254,24.297,32,24.297z M32,37c-2.761,0-5-2.239-5-5c0-2.761,2.239-5,5-5s5,2.239,5,5C37,34.761,34.761,37,32,37z M40.007,22.193c-0.994,0-1.8,0.806-1.8,1.8c0,0.994,0.806,1.8,1.8,1.8c0.994,0,1.8-0.806,1.8-1.8C41.807,22.999,41.001,22.193,40.007,22.193z"></path></symbol><symbol id="instagram-unauth-mask" viewBox="0 0 64 64"><path d="M43.693,23.153c-0.272-0.7-0.597-1.2-1.122-1.725c-0.525-0.525-1.025-0.85-1.725-1.122c-0.529-0.205-1.323-0.45-2.785-0.517c-1.582-0.072-2.056-0.087-6.061-0.087s-4.48,0.015-6.061,0.087c-1.462,0.067-2.257,0.311-2.785,0.517c-0.7,0.272-1.2,0.597-1.725,1.122c-0.525,0.525-0.85,1.025-1.122,1.725c-0.205,0.529-0.45,1.323-0.516,2.785c-0.072,1.582-0.087,2.056-0.087,6.061s0.015,4.48,0.087,6.061c0.067,1.462,0.311,2.257,0.516,2.785c0.272,0.7,0.597,1.2,1.122,1.725s1.025,0.85,1.725,1.122c0.529,0.205,1.323,0.45,2.785,0.516c1.581,0.072,2.056,0.087,6.061,0.087s4.48-0.015,6.061-0.087c1.462-0.067,2.257-0.311,2.785-0.516c0.7-0.272,1.2-0.597,1.725-1.122s0.85-1.025,1.122-1.725c0.205-0.529,0.45-1.323,0.516-2.785c0.072-1.582,0.087-2.056,0.087-6.061s-0.015-4.48-0.087-6.061C44.143,24.476,43.899,23.682,43.693,23.153z M32,39.703c-4.254,0-7.703-3.449-7.703-7.703s3.449-7.703,7.703-7.703s7.703,3.449,7.703,7.703S36.254,39.703,32,39.703z M40.007,25.793c-0.994,0-1.8-0.806-1.8-1.8c0-0.994,0.806-1.8,1.8-1.8c0.994,0,1.8,0.806,1.8,1.8C41.807,24.987,41.001,25.793,40.007,25.793z M0,0v64h64V0H0z M46.91,38.184c-0.073,1.597-0.326,2.687-0.697,3.641c-0.383,0.986-0.896,1.823-1.73,2.657c-0.834,0.834-1.67,1.347-2.657,1.73c-0.954,0.371-2.044,0.624-3.641,0.697C36.585,46.983,36.074,47,32,47s-4.585-0.017-6.184-0.09c-1.597-0.073-2.687-0.326-3.641-0.697c-0.986-0.383-1.823-0.896-2.657-1.73c-0.834-0.834-1.347-1.67-1.73-2.657c-0.371-0.954-0.624-2.044-0.697-3.641C17.017,36.585,17,36.074,17,32c0-4.074,0.017-4.585,0.09-6.185c0.073-1.597,0.326-2.687,0.697-3.641c0.383-0.986,0.896-1.823,1.73-2.657c0.834-0.834,1.67-1.347,2.657-1.73c0.954-0.371,2.045-0.624,3.641-0.697C27.415,17.017,27.926,17,32,17s4.585,0.017,6.184,0.09c1.597,0.073,2.687,0.326,3.641,0.697c0.986,0.383,1.823,0.896,2.657,1.73c0.834,0.834,1.347,1.67,1.73,2.657c0.371,0.954,0.624,2.044,0.697,3.641C46.983,27.415,47,27.926,47,32C47,36.074,46.983,36.585,46.91,38.184z M32,27c-2.761,0-5,2.239-5,5s2.239,5,5,5s5-2.239,5-5S34.761,27,32,27z"></path></symbol><symbol id="linkedin-unauth-icon" viewBox="0 0 64 64"><path d="M20.4,44h5.4V26.6h-5.4V44z M23.1,18c-1.7,0-3.1,1.4-3.1,3.1c0,1.7,1.4,3.1,3.1,3.1 c1.7,0,3.1-1.4,3.1-3.1C26.2,19.4,24.8,18,23.1,18z M39.5,26.2c-2.6,0-4.4,1.4-5.1,2.8h-0.1v-2.4h-5.2V44h5.4v-8.6 c0-2.3,0.4-4.5,3.2-4.5c2.8,0,2.8,2.6,2.8,4.6V44H46v-9.5C46,29.8,45,26.2,39.5,26.2z"></path></symbol><symbol id="linkedin-unauth-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M25.8,44h-5.4V26.6h5.4V44z M23.1,24.3c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1 c1.7,0,3.1,1.4,3.1,3.1C26.2,22.9,24.8,24.3,23.1,24.3z M46,44h-5.4v-8.4c0-2,0-4.6-2.8-4.6c-2.8,0-3.2,2.2-3.2,4.5V44h-5.4V26.6 h5.2V29h0.1c0.7-1.4,2.5-2.8,5.1-2.8c5.5,0,6.5,3.6,6.5,8.3V44z"></path></symbol><symbol id="medium-icon" viewBox="0 0 64 64"><path d="M46.908,23.95c-0.006-0.005-0.011-0.01-0.018-0.014l-0.01-0.005l-9.05-4.525c-0.061-0.031-0.125-0.051-0.19-0.068c-0.082-0.021-0.165-0.034-0.249-0.034c-0.347,0-0.692,0.174-0.878,0.477l-5.21,8.467l6.538,10.625l9.095-14.779C46.966,24.046,46.952,23.985,46.908,23.95z M28.433,35.958L37,40.241L28.433,26.32V35.958zM38.287,40.884l7.052,3.526C46.256,44.869,47,44.548,47,43.693V26.726L38.287,40.884z M26.946,23.964l-8.839-4.419c-0.16-0.08-0.312-0.118-0.449-0.118c-0.387,0-0.659,0.299-0.659,0.802v19.083c0,0.511,0.374,1.116,0.831,1.344l7.785,3.892c0.2,0.1,0.39,0.147,0.561,0.147c0.484,0,0.823-0.374,0.823-1.003V24.051C27,24.014,26.979,23.98,26.946,23.964z"></path></symbol><symbol id="medium-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M27,43.693c0,0.628-0.339,1.003-0.823,1.003c-0.172,0-0.362-0.047-0.561-0.147l-7.785-3.892C17.374,40.428,17,39.823,17,39.312V20.229c0-0.503,0.271-0.802,0.659-0.802c0.137,0,0.289,0.038,0.449,0.118l8.839,4.419C26.979,23.98,27,24.014,27,24.051V43.693z M28.433,35.958V26.32L37,40.241L28.433,35.958z M31.303,28.248l5.21-8.467c0.187-0.303,0.532-0.477,0.878-0.477c0.084,0,0.167,0.013,0.249,0.034c0.065,0.017,0.129,0.038,0.19,0.068l9.05,4.525l0.01,0.005c0.007,0.003,0.012,0.009,0.018,0.014c0.043,0.034,0.058,0.095,0.028,0.145l-9.095,14.779L31.303,28.248z M47,43.693c0,0.855-0.744,1.176-1.661,0.717l-7.052-3.526L47,26.726V43.693z"></path></symbol><symbol id="meetup-icon" viewBox="0 0 64 64"><path d="M30.8,33.4c0-6.3,1.9-11.9,3.5-15.3c0.5-1.1,0.9-1.4,1.9-1.4c1.3,0,2.9,0.2,4.1,0.4 c1.1,0.2,1.5,1.6,1.7,2.5c1.2,4.5,4.7,18.7,5.5,22.4c0.2,0.8,0.6,2,0.1,2.3c-0.4,0.2-2.5,0.9-3.9,1c-0.6,0.1-1.1-0.6-1.4-1.5 c-1.5-4.6-3.5-11.8-5.2-16.6c0,3.7-0.3,10.8-0.4,12c-0.1,1.7-0.4,3.7-1.8,3.9c-1.1,0.2-2.4,0.4-4,0.4c-1.3,0-1.8-0.9-2.4-1.8 c-1-1.4-3.1-4.8-4.1-6.9c0.3,2.3,0.7,4.7,0.9,5.8c0.1,0.8,0,1.5-0.6,1.9c-1,0.7-3.2,1.4-4.1,1.4c-0.8,0-1.5-0.8-1.6-1.6 c-0.7-3.4-1.2-8-1.1-11.1c0-2.8,0-5.9,0.2-8.3c0-0.7,0.3-1.1,0.9-1.4c1.2-0.5,3-0.6,4.7-0.3c0.8,0.1,1,0.8,1.4,1.4 C26.9,25.5,28.9,29.5,30.8,33.4z"></path></symbol><symbol id="meetup-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M47.8,44.3c-0.4,0.2-2.5,0.9-3.9,1c-0.6,0.1-1.1-0.6-1.4-1.5c-1.5-4.6-3.5-11.8-5.2-16.6 c0,3.7-0.3,10.8-0.4,12c-0.1,1.7-0.4,3.7-1.8,3.9c-1.1,0.2-2.4,0.4-4,0.4c-1.3,0-1.8-0.9-2.4-1.8c-1-1.4-3.1-4.8-4.1-6.9 c0.3,2.3,0.7,4.7,0.9,5.8c0.1,0.8,0,1.5-0.6,1.9c-1,0.7-3.2,1.4-4.1,1.4c-0.8,0-1.5-0.8-1.6-1.6c-0.7-3.4-1.2-8-1.1-11.1 c0-2.8,0-5.9,0.2-8.3c0-0.7,0.3-1.1,0.9-1.4c1.2-0.5,3-0.6,4.7-0.3c0.8,0.1,1,0.8,1.4,1.4c1.7,2.8,3.8,6.7,5.7,10.6 c0-6.3,1.9-11.9,3.5-15.3c0.5-1.1,0.9-1.4,1.9-1.4c1.3,0,2.9,0.2,4.1,0.4c1.1,0.2,1.5,1.6,1.7,2.5c1.2,4.5,4.7,18.7,5.5,22.4 C47.8,42.8,48.3,44,47.8,44.3z"></path></symbol><symbol id="pinterest-unauth-icon" viewBox="0 0 64 64"><path d="M32,16c-8.8,0-16,7.2-16,16c0,6.6,3.9,12.2,9.6,14.7c0-1.1,0-2.5,0.3-3.7 c0.3-1.3,2.1-8.7,2.1-8.7s-0.5-1-0.5-2.5c0-2.4,1.4-4.1,3.1-4.1c1.5,0,2.2,1.1,2.2,2.4c0,1.5-0.9,3.7-1.4,5.7 c-0.4,1.7,0.9,3.1,2.5,3.1c3,0,5.1-3.9,5.1-8.5c0-3.5-2.4-6.1-6.7-6.1c-4.9,0-7.9,3.6-7.9,7.7c0,1.4,0.4,2.4,1.1,3.1 c0.3,0.3,0.3,0.5,0.2,0.9c-0.1,0.3-0.3,1-0.3,1.3c-0.1,0.4-0.4,0.6-0.8,0.4c-2.2-0.9-3.3-3.4-3.3-6.1c0-4.5,3.8-10,11.4-10 c6.1,0,10.1,4.4,10.1,9.2c0,6.3-3.5,11-8.6,11c-1.7,0-3.4-0.9-3.9-2c0,0-0.9,3.7-1.1,4.4c-0.3,1.2-1,2.5-1.6,3.4 c1.4,0.4,3,0.7,4.5,0.7c8.8,0,16-7.2,16-16C48,23.2,40.8,16,32,16z"></path></symbol><symbol id="pinterest-unauth-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M32,48c-1.6,0-3.1-0.2-4.5-0.7c0.6-1,1.3-2.2,1.6-3.4c0.2-0.7,1.1-4.4,1.1-4.4 c0.6,1.1,2.2,2,3.9,2c5.1,0,8.6-4.7,8.6-11c0-4.7-4-9.2-10.1-9.2c-7.6,0-11.4,5.5-11.4,10c0,2.8,1,5.2,3.3,6.1 c0.4,0.1,0.7,0,0.8-0.4c0.1-0.3,0.2-1,0.3-1.3c0.1-0.4,0.1-0.5-0.2-0.9c-0.6-0.8-1.1-1.7-1.1-3.1c0-4,3-7.7,7.9-7.7 c4.3,0,6.7,2.6,6.7,6.1c0,4.6-2,8.5-5.1,8.5c-1.7,0-2.9-1.4-2.5-3.1c0.5-2,1.4-4.2,1.4-5.7c0-1.3-0.7-2.4-2.2-2.4 c-1.7,0-3.1,1.8-3.1,4.1c0,1.5,0.5,2.5,0.5,2.5s-1.8,7.4-2.1,8.7c-0.3,1.2-0.3,2.6-0.3,3.7C19.9,44.2,16,38.6,16,32 c0-8.8,7.2-16,16-16c8.8,0,16,7.2,16,16C48,40.8,40.8,48,32,48z"></path></symbol><symbol id="reddit-icon" viewBox="0 0 64 64"><path d="M47.8,30.7c0-2.1-1.7-3.8-3.8-3.8c-0.9,0-1.7,0.3-2.4,0.9c-2.3-1.4-5.2-2.4-8.5-2.5l1.7-5.3 l4.6,1.1c0.1,1.6,1.5,3,3.2,3c1.8,0,3.2-1.4,3.2-3.2s-1.4-3.2-3.2-3.2c-1.2,0-2.3,0.7-2.8,1.7l-5.3-1.2c-0.4-0.1-0.9,0.1-1,0.6 l-2.1,6.5c-3.5,0.1-6.7,1-9.1,2.6c-0.7-0.5-1.5-0.9-2.4-0.9c-2.1,0-3.8,1.7-3.8,3.8c0,1.3,0.7,2.5,1.7,3.1c0,0.3-0.1,0.6-0.1,0.9 c0,5.3,6.4,9.6,14.2,9.6s14.2-4.3,14.2-9.6c0-0.3,0-0.6-0.1-0.9C47.2,33.2,47.8,32,47.8,30.7z M42.6,19.4c0.8,0,1.5,0.7,1.5,1.5 c0,0.8-0.7,1.5-1.5,1.5s-1.5-0.7-1.5-1.5C41.1,20,41.8,19.4,42.6,19.4z M17.8,30.7c0-1.2,0.9-2.1,2.1-2.1c0.3,0,0.6,0.1,0.9,0.2 c-1.1,0.9-2,2-2.5,3.2C18.1,31.7,17.8,31.2,17.8,30.7z M32,42.6c-6.9,0-12.5-3.5-12.5-7.9s5.6-7.9,12.5-7.9s12.5,3.5,12.5,7.9 S38.9,42.6,32,42.6z M45.6,32.1c-0.5-1.2-1.4-2.3-2.5-3.2c0.3-0.1,0.6-0.2,0.9-0.2c1.2,0,2.1,0.9,2.1,2.1 C46.2,31.2,45.9,31.7,45.6,32.1z M29.4,33.1c0-1.2-1-2.1-2.1-2.1s-2.1,1-2.1,2.1s1,2.2,2.1,2.2S29.4,34.2,29.4,33.1z M36.7,30.9 c-1.2,0-2.1,1-2.1,2.1s1,2.2,2.1,2.2c1.2,0,2.1-1,2.1-2.2S37.9,30.9,36.7,30.9z M36,38.2c-0.8,0.8-2.1,1.1-4,1.1 c-1.9,0-3.2-0.4-4-1.1c-0.3-0.3-0.9-0.3-1.2,0c-0.3,0.3-0.3,0.9,0,1.2c1.1,1.1,2.8,1.6,5.2,1.6c2.4,0,4.1-0.5,5.2-1.6 c0.3-0.3,0.3-0.9,0-1.2C36.9,37.8,36.3,37.8,36,38.2z"></path></symbol><symbol id="reddit-mask" viewBox="0 0 64 64"><path d="M32,26.9c-6.9,0-12.5,3.5-12.5,7.9s5.6,7.9,12.5,7.9s12.5-3.5,12.5-7.9S38.9,26.9,32,26.9z M25.2,33.1 c0-1.2,1-2.1,2.1-2.1s2.1,1,2.1,2.1s-1,2.2-2.1,2.2S25.2,34.2,25.2,33.1z M37.2,39.4C36.1,40.5,34.4,41,32,41 c-2.4,0-4.1-0.5-5.2-1.6c-0.3-0.3-0.3-0.9,0-1.2c0.3-0.3,0.9-0.3,1.2,0c0.8,0.8,2.1,1.1,4,1.1c1.9,0,3.2-0.4,4-1.1 c0.3-0.3,0.9-0.3,1.2,0C37.5,38.5,37.5,39,37.2,39.4z M36.7,35.2c-1.2,0-2.1-1-2.1-2.2s1-2.1,2.1-2.1c1.2,0,2.1,1,2.1,2.1 S37.9,35.2,36.7,35.2z M44.1,28.6c-0.3,0-0.6,0.1-0.9,0.2c1.1,0.9,2,2,2.5,3.2c0.3-0.4,0.5-0.8,0.5-1.4 C46.2,29.6,45.2,28.6,44.1,28.6z M20.9,28.8c-0.3-0.1-0.6-0.2-0.9-0.2c-1.2,0-2.1,0.9-2.1,2.1c0,0.5,0.2,1,0.5,1.4 C18.9,30.9,19.8,29.8,20.9,28.8z M42.6,22.3c0.8,0,1.5-0.7,1.5-1.5c0-0.8-0.7-1.5-1.5-1.5s-1.5,0.7-1.5,1.5 C41.1,21.7,41.8,22.3,42.6,22.3z M0,0v64h64V0H0z M46.1,33.9c0,0.3,0.1,0.6,0.1,0.9c0,5.3-6.4,9.6-14.2,9.6S17.8,40,17.8,34.8 c0-0.3,0-0.6,0.1-0.9c-1-0.7-1.7-1.8-1.7-3.1c0-2.1,1.7-3.8,3.8-3.8c0.9,0,1.7,0.3,2.4,0.9c2.4-1.5,5.6-2.5,9.1-2.6l2.1-6.5 c0.1-0.4,0.6-0.7,1-0.6l5.3,1.2c0.5-1,1.6-1.7,2.8-1.7c1.8,0,3.2,1.4,3.2,3.2S44.3,24,42.6,24c-1.7,0-3-1.3-3.2-3L34.8,20l-1.7,5.3 c3.3,0.2,6.2,1.1,8.5,2.5c0.7-0.5,1.5-0.9,2.4-0.9c2.1,0,3.8,1.7,3.8,3.8C47.8,32,47.2,33.2,46.1,33.9z"></path></symbol><symbol id="smugmug-unauth-icon" viewBox="0 0 64 64"><path d="M25.4,22.9c2.8,0,4.1-1.7,3.9-3.1 c-0.1-1.2-1.3-2.4-3.6-2.4c-1.9,0-3.1,1.4-3.3,2.8C22.3,21.6,23.1,23,25.4,22.9z M39.2,22.6c2.6-0.1,3.8-1.5,3.8-2.8 c0-1.5-1.4-3-3.8-2.8c-1.9,0.2-3,1.5-3.2,2.8C35.9,21.3,36.9,22.7,39.2,22.6z M40.9,28.5c-6.6,0.7-6.9,0.7-19,1 c-5.1,0-4,17.5,6.9,17.5C39.2,47,51.7,27.4,40.9,28.5z M29,43.9c-9.5,0-8.2-11.3-6.6-11.4c11.1-0.4,13.9-0.9,17.8-0.9 C44.3,31.6,36.6,43.9,29,43.9z"></path></symbol><symbol id="smugmug-unauth-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M36.1,19.8c0.2-1.3,1.3-2.6,3.2-2.8c2.4-0.2,3.8,1.3,3.8,2.8c0,1.3-1.2,2.6-3.8,2.8 C36.9,22.7,35.9,21.3,36.1,19.8z M22.5,20.2c0.2-1.4,1.4-2.8,3.3-2.8c2.3,0,3.5,1.1,3.6,2.4c0.2,1.5-1.1,3.1-3.9,3.1 C23.1,23,22.3,21.6,22.5,20.2z M28.8,47c-10.9,0-12-17.5-6.9-17.5c12.1-0.3,12.5-0.3,19-1C51.7,27.4,39.2,47,28.8,47z M40.3,31.6 c-3.9,0-6.8,0.5-17.8,0.9c-1.6,0.1-2.9,11.4,6.6,11.4C36.6,43.9,44.3,31.6,40.3,31.6z"></path></symbol><symbol id="snapchat-icon" viewBox="0 0 64 64"><g class="svg-icon"><path d="M32.309,15.962h-0.001c-0.028,0-0.054,0-0.078,0.001l0,0c0,0-0.513,0.005-0.554,0.005c-1.32,0-5.794,0.368-7.905,5.1c-0.71,1.592-0.54,4.296-0.403,6.469c0.016,0.256,0.033,0.522,0.048,0.779c-0.109,0.06-0.309,0.136-0.622,0.136c-0.419,0-0.914-0.132-1.472-0.394c-0.148-0.069-0.319-0.104-0.507-0.104c-0.653,0-1.434,0.43-1.555,1.07c-0.088,0.461,0.119,1.134,1.601,1.719c0.134,0.053,0.294,0.104,0.464,0.158c0.612,0.194,1.538,0.488,1.789,1.08c0.13,0.306,0.078,0.701-0.154,1.172c-0.005,0.011-0.01,0.021-0.015,0.032c-0.081,0.19-2.04,4.655-6.389,5.371c-0.334,0.055-0.573,0.353-0.555,0.692c0.006,0.101,0.03,0.201,0.071,0.298c0.326,0.763,1.703,1.322,4.21,1.711c0.084,0.113,0.171,0.514,0.224,0.758c0.052,0.241,0.106,0.489,0.183,0.751c0.076,0.257,0.272,0.565,0.776,0.565c0.204,0,0.444-0.047,0.723-0.102c0.418-0.082,0.99-0.193,1.706-0.193c0.397,0,0.809,0.035,1.223,0.103c0.809,0.135,1.496,0.621,2.292,1.183c1.14,0.806,2.431,1.718,4.393,1.718c0.054,0,0.108-0.002,0.162-0.006c0.064,0.003,0.146,0.006,0.234,0.006c1.963,0,3.253-0.913,4.392-1.718c0.798-0.563,1.484-1.049,2.293-1.184c0.414-0.069,0.825-0.103,1.222-0.103c0.683,0,1.223,0.087,1.706,0.181c0.302,0.059,0.545,0.089,0.723,0.089l0.019,0h0.018c0.373,0,0.636-0.197,0.74-0.554c0.076-0.256,0.13-0.498,0.183-0.743c0.053-0.243,0.14-0.642,0.223-0.754c2.508-0.389,3.884-0.948,4.21-1.707c0.042-0.097,0.066-0.198,0.072-0.3c0.019-0.339-0.22-0.636-0.554-0.691c-4.351-0.717-6.308-5.181-6.389-5.371c-0.005-0.011-0.01-0.022-0.015-0.032c-0.232-0.471-0.284-0.865-0.154-1.172c0.251-0.592,1.176-0.885,1.788-1.079c0.171-0.054,0.332-0.106,0.465-0.158c1.085-0.428,1.629-0.954,1.617-1.564c-0.009-0.478-0.382-0.905-0.974-1.117l-0.002-0.001c-0.199-0.083-0.436-0.128-0.667-0.128c-0.158,0-0.393,0.022-0.613,0.124c-0.516,0.242-0.98,0.373-1.379,0.391c-0.265-0.012-0.439-0.079-0.537-0.134c0.013-0.22,0.027-0.447,0.042-0.685l0.006-0.092c0.137-2.174,0.307-4.881-0.403-6.474C38.117,16.33,33.633,15.962,32.309,15.962L32.309,15.962z"></path></g></symbol><symbol id="snapchat-mask" viewBox="0 0 64 64"><g class="svg-mask"><path d="M0,0v64h64V0H0z M47.927,39.545c-0.326,0.76-1.702,1.318-4.21,1.707c-0.083,0.113-0.17,0.511-0.223,0.754c-0.054,0.245-0.108,0.487-0.183,0.743c-0.104,0.357-0.367,0.554-0.74,0.554h-0.018l-0.019,0c-0.177,0-0.421-0.03-0.723-0.089c-0.482-0.094-1.022-0.181-1.706-0.181c-0.397,0-0.809,0.034-1.222,0.103c-0.809,0.135-1.496,0.62-2.293,1.184c-1.139,0.805-2.43,1.718-4.392,1.718c-0.088,0-0.171-0.003-0.234-0.006c-0.054,0.004-0.108,0.006-0.162,0.006c-1.962,0-3.253-0.912-4.393-1.718c-0.796-0.562-1.483-1.048-2.292-1.183c-0.414-0.069-0.826-0.103-1.223-0.103c-0.716,0-1.288,0.112-1.706,0.193c-0.278,0.055-0.519,0.102-0.723,0.102c-0.505,0-0.701-0.308-0.776-0.565c-0.077-0.262-0.131-0.51-0.183-0.751c-0.053-0.244-0.14-0.644-0.224-0.758c-2.507-0.389-3.884-0.948-4.21-1.711c-0.041-0.097-0.065-0.197-0.071-0.298c-0.019-0.338,0.22-0.637,0.555-0.692c4.349-0.716,6.308-5.181,6.389-5.371c0.005-0.011,0.01-0.021,0.015-0.032c0.232-0.471,0.284-0.866,0.154-1.172c-0.251-0.592-1.177-0.885-1.789-1.08c-0.17-0.054-0.331-0.105-0.464-0.157c-1.482-0.585-1.688-1.258-1.601-1.719c0.122-0.64,0.903-1.07,1.555-1.07c0.189,0,0.359,0.035,0.507,0.104c0.557,0.261,1.053,0.394,1.472,0.394c0.314,0,0.513-0.075,0.622-0.136c-0.015-0.257-0.032-0.523-0.048-0.779c-0.136-2.173-0.307-4.877,0.403-6.469c2.111-4.732,6.585-5.1,7.905-5.1c0.041,0,0.554-0.005,0.554-0.005c0.025-0.001,0.051-0.001,0.078-0.001h0.001c1.324,0,5.807,0.368,7.919,5.103c0.711,1.593,0.54,4.299,0.403,6.474l-0.006,0.092c-0.015,0.237-0.029,0.464-0.042,0.685c0.099,0.055,0.272,0.121,0.537,0.134c0.4-0.018,0.863-0.149,1.379-0.391c0.219-0.103,0.454-0.124,0.613-0.124c0.232,0,0.468,0.045,0.667,0.128l0.002,0.001c0.592,0.212,0.965,0.638,0.974,1.117c0.011,0.609-0.533,1.135-1.617,1.564c-0.132,0.052-0.293,0.103-0.465,0.158c-0.612,0.194-1.538,0.488-1.788,1.079c-0.13,0.306-0.079,0.701,0.154,1.172c0.005,0.011,0.01,0.021,0.015,0.032c0.081,0.189,2.038,4.654,6.389,5.371c0.334,0.055,0.573,0.353,0.555,0.691C47.993,39.347,47.969,39.448,47.927,39.545z"></path></g></symbol><symbol id="soundcloud-unauth-icon" viewBox="0 0 64 64"><path d="M43.6,30c-0.6,0-1.2,0.1-1.7,0.3c-0.3-4-3.7-7.1-7.7-7.1c-1,0-2,0.2-2.8,0.5 C31.1,23.9,31,24,31,24.3v13.9c0,0.3,0.2,0.5,0.5,0.5c0,0,12.2,0,12.2,0c2.4,0,4.4-1.9,4.4-4.4C48,31.9,46,30,43.6,30z M27.2,25.1 c-0.7,0-1.2,0.5-1.2,1.1v11.3c0,0.7,0.6,1.2,1.2,1.2c0.7,0,1.2-0.6,1.2-1.2V26.2C28.4,25.6,27.8,25.1,27.2,25.1z M22.2,27.8 c-0.7,0-1.2,0.5-1.2,1.1v8.5c0,0.7,0.6,1.2,1.2,1.2s1.2-0.6,1.2-1.2V29C23.4,28.3,22.9,27.8,22.2,27.8z M17.2,30.2 c-0.7,0-1.2,0.5-1.2,1.1v4.9c0,0.7,0.6,1.2,1.2,1.2c0.7,0,1.2-0.6,1.2-1.2v-4.9C18.5,30.7,17.9,30.2,17.2,30.2z"></path></symbol><symbol id="soundcloud-unauth-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M18.5,36.3c0,0.7-0.6,1.2-1.2,1.2c-0.7,0-1.2-0.6-1.2-1.2v-4.9c0-0.6,0.6-1.1,1.2-1.1 c0.7,0,1.2,0.5,1.2,1.1V36.3z M23.4,37.5c0,0.7-0.6,1.2-1.2,1.2S21,38.2,21,37.5V29c0-0.6,0.6-1.1,1.2-1.1s1.2,0.5,1.2,1.1V37.5z  M28.4,37.5c0,0.7-0.6,1.2-1.2,1.2c-0.7,0-1.2-0.6-1.2-1.2V26.2c0-0.6,0.6-1.1,1.2-1.1c0.7,0,1.2,0.5,1.2,1.1V37.5z M43.6,38.7 c0,0-12.1,0-12.2,0c-0.3,0-0.5-0.2-0.5-0.5V24.3c0-0.3,0.1-0.4,0.4-0.5c0.9-0.3,1.8-0.5,2.8-0.5c4,0,7.4,3.1,7.7,7.1 c0.5-0.2,1.1-0.3,1.7-0.3c2.4,0,4.4,2,4.4,4.4C48,36.8,46,38.7,43.6,38.7z"></path></symbol><symbol id="spotify-unauth-icon" viewBox="0 0 64 64"><path d="M32,16c-8.8,0-16,7.2-16,16c0,8.8,7.2,16,16,16c8.8,0,16-7.2,16-16C48,23.2,40.8,16,32,16 M39.3,39.1c-0.3,0.5-0.9,0.6-1.4,0.3c-3.8-2.3-8.5-2.8-14.1-1.5c-0.5,0.1-1.1-0.2-1.2-0.7c-0.1-0.5,0.2-1.1,0.8-1.2 c6.1-1.4,11.3-0.8,15.5,1.8C39.5,38,39.6,38.6,39.3,39.1 M41.3,34.7c-0.4,0.6-1.1,0.8-1.7,0.4c-4.3-2.6-10.9-3.4-15.9-1.9 c-0.7,0.2-1.4-0.2-1.6-0.8c-0.2-0.7,0.2-1.4,0.8-1.6c5.8-1.8,13-0.9,18,2.1C41.5,33.4,41.7,34.1,41.3,34.7 M41.5,30.2 c-5.2-3.1-13.7-3.3-18.6-1.9c-0.8,0.2-1.6-0.2-1.9-1c-0.2-0.8,0.2-1.6,1-1.9c5.7-1.7,15-1.4,21,2.1c0.7,0.4,0.9,1.3,0.5,2.1 C43.1,30.4,42.2,30.6,41.5,30.2"></path></symbol><symbol id="spotify-unauth-mask" viewBox="0 0 64 64"><path d="M39,37.7c-4.2-2.6-9.4-3.2-15.5-1.8c-0.5,0.1-0.9,0.7-0.8,1.2c0.1,0.5,0.7,0.9,1.2,0.7c5.6-1.3,10.3-0.8,14.1,1.5 c0.5,0.3,1.1,0.1,1.4-0.3C39.6,38.6,39.5,38,39,37.7z M40.9,33c-4.9-3-12.2-3.9-18-2.1c-0.7,0.2-1,0.9-0.8,1.6 c0.2,0.7,0.9,1,1.6,0.8c5.1-1.5,11.6-0.8,15.9,1.9c0.6,0.4,1.4,0.2,1.7-0.4C41.7,34.1,41.5,33.4,40.9,33z M0,0v64h64V0H0z M32,48 c-8.8,0-16-7.2-16-16c0-8.8,7.2-16,16-16c8.8,0,16,7.2,16,16C48,40.8,40.8,48,32,48z M43,27.6c-5.9-3.5-15.3-3.9-21-2.1 c-0.8,0.2-1.2,1.1-1,1.9c0.2,0.8,1.1,1.2,1.9,1c4.9-1.5,13.4-1.2,18.6,1.9c0.7,0.4,1.6,0.2,2.1-0.5C43.9,29,43.7,28,43,27.6z"></path></symbol><symbol id="stitcher-icon" viewBox="0 0 64 64"><path d="M17,38h3V26h-3V38z M22,38h3V26h-3V38z M27,38h10V26H27V38z M39,43h2V21h-2V43z M43,26v12h4V26H43z"></path></symbol><symbol id="stitcher-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M20,38h-3V26h3V38z M25,38h-3V26h3V38z M37,38H27V26h10V38z M41,43h-2V21h2V43z M47,38h-4V26h4 V38z"></path></symbol><symbol id="thedots-icon" viewBox="0 0 64 64"><g class="svg-icon"><path class="st0" d="M32 15.9c-8.8 0-16 7.2-16 16s7.2 16 16 16 16-7.2 16-16c0-8.9-7.2-16-16-16zm0 30c-7.8 0-14.1-6.3-14.1-14.1s6.4-14 14.1-14 14.1 6.3 14.1 14.1-6.3 14-14.1 14z"></path><circle class="st0" cx="32" cy="31.9" r="1.9"></circle><circle class="st0" cx="32" cy="26" r="1.9"></circle><circle class="st0" cx="26.2" cy="31.9" r="1.9"></circle><circle class="st0" cx="37.9" cy="31.9" r="1.9"></circle><circle class="st0" cx="32" cy="37.7" r="1.9"></circle></g></symbol><symbol id="thedots-mask" viewBox="0 0 64 64"><g class="svg-mask"><path d="M32 17.8c-7.7 0-14.1 6.2-14.1 14S24.2 45.9 32 45.9s14.1-6.2 14.1-14S39.7 17.8 32 17.8zm-5.8 16c-1 0-1.9-.9-1.9-1.9 0-1 .9-1.9 1.9-1.9 1 0 1.9.9 1.9 1.9 0 1-.9 1.9-1.9 1.9zm5.8 5.8c-1 0-1.9-.9-1.9-1.9s.9-1.9 1.9-1.9 1.9.9 1.9 1.9-.9 1.9-1.9 1.9zm0-5.8c-1 0-1.9-.9-1.9-1.9 0-1 .9-1.9 1.9-1.9s1.9.9 1.9 1.9c0 1-.9 1.9-1.9 1.9zm0-5.9c-1 0-1.9-.9-1.9-1.9 0-1 .9-1.9 1.9-1.9s1.9.9 1.9 1.9c0 1-.9 1.9-1.9 1.9zm5.9 5.9c-1 0-1.9-.9-1.9-1.9 0-1 .9-1.9 1.9-1.9 1 0 1.9.9 1.9 1.9 0 1-.9 1.9-1.9 1.9z"></path><path d="M0 0v64h64V0H0zm32 47.9c-8.8 0-16-7.2-16-16s7.2-16 16-16 16 7.1 16 16c0 8.8-7.2 16-16 16z"></path></g></symbol><symbol id="tidal-icon" viewBox="0 0 64 64"><polygon points="16,27.667 21.333,33 26.667,27.667 32,33 26.667,38.333 32,43.667 37.333,38.333 32,33 37.333,27.667 42.667,33 48,27.667 42.667,22.333 37.333,27.667 32,22.333 26.667,27.667 21.333,22.333 "></polygon></symbol><symbol id="tidal-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M42.667,33l-5.333-5.333L32,33l5.333,5.333L32,43.667l-5.333-5.333L32,33l-5.333-5.333L21.333,33 L16,27.667l5.333-5.333l5.333,5.333L32,22.333l5.333,5.333l5.333-5.333L48,27.667L42.667,33z"></path></symbol><symbol id="tiktok-unauth-icon" viewBox="0 0 64 64"><path d="M37.9281 17C38.4298 21.2545 40.825 23.7941 45 24.0658V28.8451C42.5859 29.0794 40.4652 28.3016 38.0038 26.821V35.7423C38.0038 47.147 25.4788 50.7361 20.4233 42.5457C17.1856 37.3073 19.1642 28.1048 29.5496 27.73V32.781C28.7296 32.9058 27.9219 33.1002 27.1355 33.362C24.835 34.1398 23.5191 35.583 23.8883 38.1413C24.5889 43.033 33.6584 44.4856 32.901 34.9176V17H37.9091H37.9281Z"></path></symbol><symbol id="tiktok-unauth-mask" viewBox="0 0 64 64"><path fill-rule="evenodd" clip-rule="evenodd" d="M64 0H0V64H64V0ZM45.44 23.54C41 23.25 38.5 20.54 38 16H32.68V35.12C33.48 45.33 23.9 43.78 23.16 38.56C22.78 35.83 24.16 34.29 26.6 33.46C27.4272 33.1806 28.2771 32.9732 29.14 32.84V27.45C18.18 27.85 16.08 37.67 19.5 43.26C24.82 52 38.05 48.17 38.05 36V26.48C40.65 28.06 42.89 28.89 45.44 28.64V23.54Z"></path></symbol><symbol id="threads-unauth-icon" viewBox="0 0 64 64"><path d="M38.0759 30.5145C37.9596 30.4588 37.8415 30.4051 37.7218 30.3538C37.5134 26.5136 35.4151 24.315 31.8918 24.2925C31.8758 24.2924 31.8599 24.2924 31.844 24.2924C29.7366 24.2924 27.9839 25.192 26.9051 26.8289L28.8428 28.1582C29.6487 26.9355 30.9135 26.6748 31.8449 26.6748C31.8557 26.6748 31.8665 26.6748 31.8771 26.6749C33.0372 26.6823 33.9126 27.0196 34.4792 27.6774C34.8915 28.1563 35.1673 28.8181 35.3038 29.6532C34.2753 29.4784 33.1629 29.4247 31.9738 29.4928C28.624 29.6858 26.4704 31.6395 26.6151 34.3543C26.6885 35.7313 27.3745 36.916 28.5467 37.6899C29.5377 38.3441 30.8141 38.6641 32.1407 38.5916C33.8926 38.4956 35.267 37.8272 36.2258 36.605C36.954 35.6768 37.4145 34.474 37.6179 32.9584C38.4528 33.4623 39.0715 34.1253 39.4133 34.9224C39.9943 36.2774 40.0282 38.504 38.2115 40.3193C36.6197 41.9096 34.7063 42.5975 31.8146 42.6188C28.607 42.595 26.1811 41.5663 24.6039 39.5612C23.1269 37.6836 22.3636 34.9717 22.3352 31.5006C22.3636 28.0295 23.1269 25.3175 24.6039 23.44C26.1811 21.4349 28.607 20.4062 31.8146 20.3824C35.0455 20.4064 37.5137 21.44 39.1513 23.4548C39.9543 24.4428 40.5597 25.6853 40.9588 27.134L43.2295 26.5282C42.7457 24.745 41.9845 23.2084 40.9486 21.934C38.8492 19.351 35.7787 18.0274 31.8225 18H31.8067C27.8585 18.0273 24.8224 19.3559 22.7828 21.9488C20.9678 24.2562 20.0316 27.4667 20.0001 31.4911L20 31.5006L20.0001 31.5101C20.0316 35.5345 20.9678 38.7451 22.7828 41.0524C24.8224 43.6452 27.8585 44.9739 31.8067 45.0012H31.8225C35.3327 44.9769 37.8069 44.0578 39.8451 42.0214C42.5119 39.3571 42.4316 36.0175 41.5526 33.9674C40.9221 32.4973 39.7198 31.3032 38.0759 30.5145ZM32.0153 36.2127C30.5472 36.2954 29.0219 35.6364 28.9467 34.2249C28.891 33.1783 29.6915 32.0105 32.1054 31.8714C32.3819 31.8555 32.6531 31.8477 32.9196 31.8477C33.7964 31.8477 34.6167 31.9329 35.3625 32.0959C35.0843 35.5698 33.4528 36.1338 32.0153 36.2127Z"></path></symbol><symbol id="threads-unauth-mask" viewBox="0 0 64 64"><path d="M28.7616 34.225C28.8368 35.6366 30.3621 36.2956 31.8303 36.2129C33.2677 36.134 34.8993 35.5699 35.1774 32.096C34.4317 31.933 33.6114 31.8478 32.7346 31.8478C32.4681 31.8478 32.1968 31.8556 31.9204 31.8715C29.5064 32.0107 28.7059 33.1785 28.7616 34.225Z"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M64 0H0V64H64V0ZM37.5367 30.3539C37.6564 30.4053 37.7745 30.4589 37.8908 30.5147C39.5348 31.3033 40.737 32.4974 41.3676 33.9675C42.2465 36.0177 42.3268 39.3572 39.6601 42.0215C37.6218 44.058 35.1476 44.977 31.6375 45.0013H31.6216C27.6735 44.9741 24.6374 43.6454 22.5977 41.0525C20.7827 38.7452 19.8465 35.5346 19.815 31.5102L19.8149 31.5007L19.815 31.4912C19.8465 27.4668 20.7827 24.2563 22.5977 21.949C24.6374 19.3561 27.6735 18.0275 31.6216 18.0001H31.6375C35.5937 18.0276 38.6642 19.3511 40.7636 21.9342C41.7995 23.2085 42.5607 24.7451 43.0444 26.5283L40.7737 27.1342C40.3746 25.6855 39.7692 24.443 38.9662 23.4549C37.3286 21.4402 34.8604 20.4065 31.6295 20.3825C28.4219 20.4063 25.9961 21.435 24.4188 23.4401C22.9419 25.3177 22.1786 28.0296 22.1501 31.5007C22.1786 34.9718 22.9419 37.6837 24.4188 39.5613C25.9961 41.5664 28.422 42.5951 31.6296 42.6189C34.5213 42.5977 36.4346 41.9097 38.0264 40.3194C39.8432 38.5042 39.8093 36.2776 39.2282 34.9226C38.8865 34.1255 38.2677 33.4624 37.4328 32.9585C37.2295 34.4741 36.7689 35.6769 36.0407 36.6051C35.0819 37.8273 33.7076 38.4957 31.9557 38.5918C30.6291 38.6642 29.3527 38.3443 28.3616 37.6901C27.1894 36.9162 26.5034 35.7315 26.43 34.3544C26.2854 31.6397 28.4389 29.6859 31.7887 29.493C32.9779 29.4248 34.0902 29.4786 35.1188 29.6534C34.9822 28.8182 34.7065 28.1564 34.2941 27.6775C33.7275 27.0197 32.8521 26.6824 31.692 26.675L31.6598 26.6749C30.7284 26.6749 29.4637 26.9356 28.6578 28.1583L26.7201 26.8291C27.7988 25.1921 29.5515 24.2926 31.6589 24.2926L31.7067 24.2927C35.23 24.3152 37.3283 26.5137 37.5367 30.3539Z"></path></symbol><symbol id="tripadvisor-icon" viewBox="0 0 64 64"><g class="svg-icon"><path d="M45.5 28.9c.4-1.5 1.5-3 1.5-3h-5c-2.8-1.8-6.2-2.8-10-2.8-3.9 0-7.5 1-10.3 2.8H17s1.1 1.5 1.5 3c-.9 1.2-1.5 2.8-1.5 4.4 0 4.1 3.4 7.5 7.5 7.5 2.4 0 4.5-1.1 5.9-2.8l1.6 2.4 1.6-2.4c.7.9 1.7 1.7 2.8 2.2 1.8.8 3.9.9 5.7.2 3.9-1.4 5.9-5.8 4.4-9.7-.2-.6-.6-1.2-1-1.8zm-21 10.4c-3.3 0-6-2.7-6-6 0-1 .3-2 .7-2.9 1-1.9 3-3.1 5.3-3.1 2.6 0 4.9 1.7 5.7 4.1.2.6.3 1.3.3 1.9 0 3.4-2.7 6-6 6zm7.5-6.5c-.3-3.8-3.4-6.9-7.3-7 2.2-.9 4.6-1.4 7.3-1.4s5.1.5 7.3 1.4c-.8 0-1.6.2-2.4.5-1.9.7-3.4 2.1-4.2 3.9-.4.9-.7 1.7-.7 2.6zm13.3 2c-.1.2-.1.5-.2.7-.1.3-.3.6-.4.9-.7 1.2-1.7 2.1-3.1 2.6-.8.3-1.5.4-2.3.4-.2 0-.4 0-.6-.1-.6-.1-1.1-.2-1.7-.5-1.5-.7-2.6-1.9-3.1-3.4-.1-.4-.2-.8-.3-1.1 0-.2-.1-.4-.1-.6v-.6c0-.8.2-1.5.5-2.3.7-1.5 1.9-2.6 3.4-3.1 3.1-1.1 6.6.4 7.7 3.5.3.8.4 1.6.4 2.4-.1.4-.1.8-.2 1.2z"></path><path d="M24.4 32c-.7 0-1.2.6-1.2 1.2 0 .7.6 1.2 1.2 1.2.7 0 1.2-.6 1.2-1.2s-.5-1.2-1.2-1.2M39.5 29.6c-2 0-3.7 1.7-3.7 3.7s1.7 3.7 3.7 3.7 3.7-1.7 3.7-3.7c0-2.1-1.7-3.7-3.7-3.7m0 6.1c-1.3 0-2.4-1.1-2.4-2.4 0-1.3 1.1-2.4 2.4-2.4 1.3 0 2.4 1.1 2.4 2.4 0 1.3-1.1 2.4-2.4 2.4"></path><path d="M24.4 29.6c-2 0-3.7 1.7-3.7 3.7s1.7 3.7 3.7 3.7 3.7-1.7 3.7-3.7c0-2.1-1.7-3.7-3.7-3.7m0 6.1c-1.3 0-2.4-1.1-2.4-2.4 0-1.3 1.1-2.4 2.4-2.4 1.3 0 2.4 1.1 2.4 2.4 0 1.3-1.1 2.4-2.4 2.4M39.5 32c-.7 0-1.2.6-1.2 1.2 0 .7.6 1.2 1.2 1.2.7 0 1.2-.6 1.2-1.2s-.5-1.2-1.2-1.2"></path></g></symbol><symbol id="tripadvisor-mask" viewBox="0 0 64 64"><g class="svg-mask"><path d="M0 0v64h64V0H0zm46.5 30.8c1.4 3.9-.6 8.2-4.4 9.7-1.9.7-3.9.6-5.7-.2-1.1-.5-2-1.3-2.8-2.2L32 40.5l-1.6-2.4c-1.4 1.7-3.5 2.8-5.9 2.8-4.1 0-7.5-3.4-7.5-7.5 0-1.7.5-3.2 1.5-4.4-.4-1.5-1.5-3-1.5-3h4.7c2.8-1.8 6.3-2.8 10.3-2.8 3.8 0 7.2 1 10 2.8h5s-1.1 1.5-1.5 3c.4.4.8 1.1 1 1.8z"></path><path d="M39.5 30.8c-1.3 0-2.4 1.1-2.4 2.4s1.1 2.4 2.4 2.4 2.4-1.1 2.4-2.4-1.1-2.4-2.4-2.4zm0 3.7c-.7 0-1.2-.6-1.2-1.2 0-.7.6-1.2 1.2-1.2.7 0 1.2.6 1.2 1.2s-.5 1.2-1.2 1.2zM24.5 27.3c-2.3 0-4.3 1.3-5.3 3.1-.5.8-.7 1.8-.7 2.9 0 3.3 2.7 6 6 6s6-2.7 6-6c0-.7-.1-1.3-.3-1.9-.8-2.4-3.1-4.1-5.7-4.1zm-.1 9.7c-2 0-3.7-1.7-3.7-3.7s1.7-3.7 3.7-3.7 3.7 1.7 3.7 3.7-1.6 3.7-3.7 3.7z"></path><path d="M24.4 30.8c-1.3 0-2.4 1.1-2.4 2.4s1.1 2.4 2.4 2.4 2.4-1.1 2.4-2.4c.1-1.3-1-2.4-2.4-2.4zm0 3.7c-.7 0-1.2-.6-1.2-1.2 0-.7.6-1.2 1.2-1.2.7 0 1.2.6 1.2 1.2.1.6-.5 1.2-1.2 1.2zM36.9 26.3c.8-.3 1.6-.4 2.4-.5-2.1-1-4.6-1.4-7.3-1.4s-5.2.5-7.3 1.4c3.9.1 7.1 3.1 7.3 7 .1-.9.3-1.7.7-2.6.8-1.8 2.3-3.2 4.2-3.9z"></path><path d="M37.4 27.7c-1.5.6-2.7 1.7-3.4 3.1-.3.7-.5 1.5-.5 2.3v.6c0 .2 0 .4.1.6.1.4.2.8.3 1.1.6 1.5 1.7 2.7 3.1 3.4.5.3 1.1.4 1.7.5.2 0 .4 0 .6.1.8 0 1.6-.1 2.3-.4 1.4-.5 2.4-1.4 3.1-2.6.2-.3.3-.6.4-.9.1-.2.2-.5.2-.7.1-.4.1-.8.2-1.1 0-.8-.1-1.6-.4-2.4-1.1-3.1-4.6-4.7-7.7-3.6zm2.1 9.3c-2 0-3.7-1.7-3.7-3.7s1.7-3.7 3.7-3.7 3.7 1.7 3.7 3.7-1.7 3.7-3.7 3.7z"></path></g></symbol><symbol id="tumblr-unauth-icon" viewBox="0 0 64 64"><path d="M39.2,41c-0.6,0.3-1.6,0.5-2.4,0.5c-2.4,0.1-2.9-1.7-2.9-3v-9.3h6v-4.5h-6V17c0,0-4.3,0-4.4,0 c-0.1,0-0.2,0.1-0.2,0.2c-0.3,2.3-1.4,6.4-5.9,8.1v3.9h3V39c0,3.4,2.5,8.1,9,8c2.2,0,4.7-1,5.2-1.8L39.2,41z"></path></symbol><symbol id="tumblr-unauth-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M35.4,47c-6.5,0.1-9-4.7-9-8v-9.8h-3v-3.9c4.6-1.6,5.6-5.7,5.9-8.1c0-0.2,0.1-0.2,0.2-0.2 c0.1,0,4.4,0,4.4,0v7.6h6v4.5h-6v9.3c0,1.3,0.5,3,2.9,3c0.8,0,1.9-0.3,2.4-0.5l1.4,4.3C40.1,46,37.6,47,35.4,47z"></path></symbol><symbol id="twitch-icon" viewBox="0 0 64 64"><path d="M40,25.6h-2.5v7.6H40V25.6z M33,25.6h-2.5v7.6H33V25.6z M20.9,18L19,23.1v20.4h7v3.8h3.8l3.8-3.8h5.7l7.6-7.6V18H20.9z M44.5,34.5L40,39h-7l-3.8,3.8V39h-5.7V20.5h21V34.5z"></path></symbol><symbol id="twitch-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M47,35.8l-7.6,7.6h-5.7l-3.8,3.8H26v-3.8h-7V23.1l1.9-5.1H47V35.8z M29.2,42.8L33,39h7l4.5-4.5 v-14h-21V39h5.7V42.8z M37.5,25.6H40v7.6h-2.5V25.6z M30.5,25.6H33v7.6h-2.5V25.6z"></path></symbol><symbol id="vevo-icon" viewBox="0 0 64 64"><path d="M43,21c-4.5,0-5.4,2.7-6.8,4.6c0,0-3.7,5.6-5.1,7.7l-3-12.3H20l5.1,20.6c1.1,3.7,4.1,3.4,4.1,3.4 c2.1,0,3.6-1.1,5-3.1L48,21C48,21,43.2,21,43,21z"></path></symbol><symbol id="vevo-mask" viewBox="0 0 64 64"><path id="mask" d="M0,0v64h64V0H0z M34.2,41.9c-1.4,2.1-2.9,3.1-5,3.1c0,0-3,0.2-4.1-3.4L20,21h8.1l3,12.3c1.4-2.1,5.1-7.7,5.1-7.7 c1.4-1.9,2.2-4.6,6.8-4.6c0.2,0,5,0,5,0L34.2,41.9z"></path></symbol><symbol id="vimeo-unauth-icon" viewBox="0 0 64 64"><path d="M47,25c-0.1,2.9-2.2,6.9-6.1,12c-4.1,5.3-7.5,8-10.4,8c-1.7,0-3.2-1.6-4.4-4.8 c-0.8-3-1.6-5.9-2.4-8.9c-0.9-3.2-1.9-4.8-2.9-4.8c-0.2,0-1,0.5-2.4,1.4L17,26c1.5-1.3,2.9-2.6,4.4-3.9c2-1.7,3.5-2.6,4.4-2.7 c2.3-0.2,3.8,1.4,4.3,4.8c0.6,3.7,1,6,1.2,6.9c0.7,3.1,1.4,4.6,2.2,4.6c0.6,0,1.6-1,2.8-3c1.3-2,1.9-3.5,2-4.5 c0.2-1.7-0.5-2.6-2-2.6c-0.7,0-1.5,0.2-2.2,0.5c1.5-4.8,4.3-7.2,8.4-7C45.7,19.1,47.2,21.1,47,25z"></path></symbol><symbol id="vimeo-unauth-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M40.9,37c-4.1,5.3-7.5,8-10.4,8c-1.7,0-3.2-1.6-4.4-4.8c-0.8-3-1.6-5.9-2.4-8.9 c-0.9-3.2-1.9-4.8-2.9-4.8c-0.2,0-1,0.5-2.4,1.4L17,26c1.5-1.3,2.9-2.6,4.4-3.9c2-1.7,3.5-2.6,4.4-2.7c2.3-0.2,3.8,1.4,4.3,4.8 c0.6,3.7,1,6,1.2,6.9c0.7,3.1,1.4,4.6,2.2,4.6c0.6,0,1.6-1,2.8-3c1.3-2,1.9-3.5,2-4.5c0.2-1.7-0.5-2.6-2-2.6c-0.7,0-1.5,0.2-2.2,0.5 c1.5-4.8,4.3-7.2,8.4-7c3.1,0.1,4.5,2.1,4.4,6C46.9,27.9,44.8,31.9,40.9,37z"></path></symbol><symbol id="vsco-icon" viewBox="0 0 64 64"><path d="M32,16c-8.823,0-16,7.178-16,16s7.177,16,16,16s16-7.178,16-16S40.823,16,32,16z M46.118,32c0,0.936-0.096,1.849-0.271,2.735l-3.654-0.979c0.098-0.572,0.161-1.156,0.161-1.756c0-0.6-0.062-1.184-0.161-1.756l3.654-0.979C46.021,30.151,46.118,31.064,46.118,32z M17.882,32c0-0.936,0.096-1.849,0.271-2.734l3.654,0.979c-0.098,0.572-0.161,1.156-0.161,1.755c0,0.599,0.062,1.184,0.161,1.755l-3.654,0.979C17.979,33.849,17.882,32.936,17.882,32zM25.379,24.05l-2.661-2.661c1.37-1.2,2.971-2.138,4.73-2.74l0.977,3.647C27.308,22.71,26.277,23.301,25.379,24.05z M24.048,25.381c-0.749,0.898-1.339,1.928-1.752,3.044l-3.647-0.977c0.601-1.758,1.538-3.358,2.738-4.728L24.048,25.381z M22.297,35.575c0.413,1.117,1.004,2.147,1.753,3.045l-2.661,2.661c-1.2-1.37-2.137-2.97-2.739-4.729L22.297,35.575z M25.38,39.951c0.898,0.749,1.929,1.34,3.045,1.753l-0.977,3.647c-1.759-0.602-3.359-1.539-4.729-2.739L25.38,39.951z M23.529,32c0-4.671,3.8-8.471,8.471-8.471s8.471,3.8,8.471,8.471s-3.8,8.471-8.471,8.471S23.529,36.671,23.529,32z M39.951,25.38l2.661-2.661c1.2,1.37,2.137,2.97,2.738,4.729l-3.647,0.977C41.29,27.308,40.7,26.278,39.951,25.38z M38.62,24.049c-0.898-0.749-1.929-1.34-3.046-1.753l0.977-3.647c1.759,0.601,3.36,1.539,4.73,2.739L38.62,24.049z M38.619,39.952l2.661,2.661c-1.37,1.2-2.97,2.137-4.729,2.738l-0.977-3.647C36.69,41.291,37.721,40.701,38.619,39.952z M39.95,38.621c0.749-0.898,1.34-1.929,1.753-3.046l3.647,0.977c-0.602,1.759-1.539,3.359-2.739,4.729L39.95,38.621z M34.736,18.153l-0.979,3.654C33.185,21.709,32.6,21.647,32,21.647c-0.6,0-1.185,0.062-1.758,0.161l-0.979-3.654c0.886-0.175,1.8-0.271,2.737-0.271C32.936,17.882,33.85,17.979,34.736,18.153z M29.264,45.847l0.979-3.654c0.572,0.098,1.157,0.161,1.757,0.161c0.6,0,1.184-0.062,1.756-0.161l0.979,3.654c-0.886,0.175-1.799,0.271-2.735,0.271C31.064,46.118,30.15,46.021,29.264,45.847z"></path></symbol><symbol id="vsco-mask" viewBox="0 0 64 64"><path d="M24.048,25.381l-2.661-2.661c-1.199,1.37-2.137,2.97-2.738,4.728l3.647,0.977C22.709,27.309,23.3,26.279,24.048,25.381z M21.647,32c0-0.599,0.062-1.184,0.161-1.755l-3.654-0.979c-0.174,0.885-0.271,1.799-0.271,2.734s0.096,1.849,0.271,2.734l3.654-0.979C21.709,33.184,21.647,32.599,21.647,32z M22.297,35.575l-3.647,0.977c0.601,1.759,1.539,3.359,2.739,4.729l2.661-2.661C23.3,37.722,22.71,36.691,22.297,35.575z M28.425,22.297l-0.977-3.647c-1.759,0.602-3.36,1.539-4.73,2.74l2.661,2.661C26.277,23.301,27.308,22.71,28.425,22.297z M22.719,42.612c1.37,1.2,2.97,2.137,4.729,2.739l0.977-3.647c-1.117-0.413-2.147-1.003-3.045-1.753L22.719,42.612z M23.529,32c0,4.671,3.8,8.471,8.471,8.471s8.471-3.8,8.471-8.471s-3.8-8.471-8.471-8.471S23.529,27.329,23.529,32z M32,21.647c0.6,0,1.185,0.062,1.757,0.161l0.979-3.654c-0.886-0.175-1.799-0.271-2.736-0.271c-0.937,0-1.851,0.096-2.737,0.271l0.979,3.654C30.815,21.709,31.4,21.647,32,21.647z M41.281,21.388c-1.371-1.2-2.971-2.138-4.73-2.739l-0.977,3.647c1.117,0.413,2.148,1.004,3.046,1.753L41.281,21.388z M39.951,25.38c0.749,0.898,1.34,1.928,1.752,3.045l3.647-0.977c-0.601-1.759-1.539-3.359-2.738-4.729L39.951,25.38z M42.353,32c0,0.6-0.062,1.184-0.161,1.756l3.654,0.979c0.175-0.885,0.271-1.799,0.271-2.735c0-0.936-0.096-1.849-0.271-2.735l-3.654,0.979C42.291,30.816,42.353,31.4,42.353,32z M0,0v64h64V0H0z M32,48c-8.823,0-16-7.178-16-16c0-8.822,7.177-16,16-16s16,7.178,16,16C48,40.822,40.823,48,32,48z M35.574,41.704l0.977,3.647c1.759-0.601,3.359-1.539,4.729-2.738l-2.661-2.661C37.721,40.701,36.69,41.291,35.574,41.704z M39.95,38.621l2.662,2.661c1.2-1.37,2.138-2.97,2.739-4.729l-3.647-0.977C41.29,36.692,40.699,37.722,39.95,38.621z M32,42.353c-0.6,0-1.185-0.062-1.757-0.161l-0.979,3.654c0.886,0.175,1.8,0.271,2.736,0.271c0.936,0,1.85-0.096,2.735-0.271l-0.979-3.654C33.184,42.291,32.6,42.353,32,42.353z"></path></symbol><symbol id="yelp-icon" viewBox="0 0 64 64"><path d="M29.5,35.7c0.5-0.1,0.9-0.6,0.9-1.2c0-0.6-0.3-1.2-0.8-1.4c0,0-1.5-0.6-1.5-0.6 c-5-2.1-5.2-2.1-5.5-2.1c-0.4,0-0.7,0.2-1,0.6c-0.5,0.8-0.7,3.3-0.5,5c0.1,0.6,0.2,1,0.3,1.3c0.2,0.4,0.5,0.6,0.9,0.6 c0.2,0,0.4,0,5.1-1.5C27.5,36.4,29.5,35.7,29.5,35.7z M32.2,37.6c-0.6-0.2-1.2-0.1-1.5,0.4c0,0-1,1.2-1,1.2 c-3.5,4.1-3.7,4.3-3.7,4.5c-0.1,0.1-0.1,0.3-0.1,0.4c0,0.2,0.1,0.4,0.3,0.6c0.8,1,4.7,2.4,6,2.2c0.4-0.1,0.7-0.3,0.9-0.7 C33,46.1,33,45.9,33,41c0,0,0-2.2,0-2.2C33.1,38.3,32.7,37.8,32.2,37.6z M32.3,16.8c-0.1-0.4-0.4-0.7-0.9-0.8 c-1.3-0.3-6.5,1.1-7.5,2.1c-0.3,0.3-0.4,0.7-0.3,1.1c0.2,0.3,6.5,10.4,6.5,10.4c0.9,1.5,1.7,1.3,2,1.2c0.3-0.1,1-0.3,0.9-2.1 C33,26.6,32.4,17.3,32.3,16.8z M36.9,33.4C36.9,33.4,36.8,33.5,36.9,33.4c0.2-0.1,0.7-0.2,1.5-0.4c5.3-1.3,5.5-1.3,5.7-1.5 c0.3-0.2,0.5-0.6,0.5-1c0,0,0,0,0,0c-0.1-1.3-2.4-4.7-3.5-5.2c-0.4-0.2-0.8-0.2-1.1,0c-0.2,0.1-0.4,0.3-3.2,4.2c0,0-1.3,1.7-1.3,1.8 c-0.3,0.4-0.3,1,0,1.5C35.8,33.3,36.3,33.6,36.9,33.4z M44.4,38.6c-0.2-0.1-0.3-0.2-5-1.7c0,0-2-0.7-2.1-0.7c-0.5-0.2-1.1,0-1.4,0.5 c-0.4,0.5-0.5,1.1-0.1,1.6l0.8,1.3c2.8,4.5,3,4.8,3.2,5c0.3,0.2,0.7,0.3,1.1,0.1c1.2-0.5,3.7-3.7,3.9-5 C44.8,39.2,44.7,38.8,44.4,38.6z"></path></symbol><symbol id="yelp-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M22.4,37.9c-0.4,0-0.7-0.2-0.9-0.6c-0.1-0.3-0.2-0.7-0.3-1.3c-0.2-1.7,0-4.2,0.5-5 c0.2-0.4,0.6-0.6,1-0.6c0.3,0,0.5,0.1,5.5,2.1c0,0,1.5,0.6,1.5,0.6c0.5,0.2,0.9,0.7,0.8,1.4c0,0.6-0.4,1.1-0.9,1.2 c0,0-2.1,0.7-2.1,0.7C22.8,37.9,22.7,37.9,22.4,37.9z M33,41c0,4.9,0,5-0.1,5.3c-0.1,0.4-0.4,0.6-0.9,0.7c-1.2,0.2-5.1-1.2-6-2.2 c-0.2-0.2-0.3-0.4-0.3-0.6c0-0.2,0-0.3,0.1-0.4c0.1-0.2,0.2-0.4,3.7-4.5c0,0,1-1.2,1-1.2c0.3-0.4,1-0.6,1.5-0.4 c0.6,0.2,0.9,0.7,0.9,1.2C33,38.8,33,41,33,41z M32.2,30.8c-0.3,0.1-1,0.3-2-1.2c0,0-6.4-10.1-6.5-10.4c-0.1-0.3,0-0.7,0.3-1.1 c1-1,6.1-2.4,7.5-2.1c0.4,0.1,0.7,0.4,0.9,0.8c0.1,0.4,0.7,9.8,0.8,11.9C33.2,30.5,32.4,30.7,32.2,30.8z M35.4,31.3 c0,0,1.3-1.8,1.3-1.8c2.8-3.9,3-4.1,3.2-4.2c0.3-0.2,0.7-0.2,1.1,0c1.1,0.5,3.4,3.9,3.5,5.2c0,0,0,0,0,0c0,0.4-0.1,0.8-0.5,1 c-0.2,0.1-0.4,0.2-5.7,1.5c-0.8,0.2-1.3,0.3-1.6,0.4c0,0,0,0,0,0c-0.5,0.1-1.1-0.1-1.4-0.6C35.1,32.3,35.1,31.7,35.4,31.3z  M44.7,39.6c-0.2,1.3-2.7,4.5-3.9,5c-0.4,0.2-0.8,0.1-1.1-0.1c-0.2-0.2-0.4-0.5-3.2-5l-0.8-1.3c-0.3-0.5-0.3-1.1,0.1-1.6 c0.4-0.5,0.9-0.6,1.4-0.5c0,0,2.1,0.7,2.1,0.7c4.6,1.5,4.8,1.6,5,1.7C44.7,38.8,44.8,39.2,44.7,39.6z"></path></symbol><symbol id="youtube-unauth-icon" viewBox="0 0 64 64"><path d="M46.7,26c0,0-0.3-2.1-1.2-3c-1.1-1.2-2.4-1.2-3-1.3C38.3,21.4,32,21.4,32,21.4h0 c0,0-6.3,0-10.5,0.3c-0.6,0.1-1.9,0.1-3,1.3c-0.9,0.9-1.2,3-1.2,3S17,28.4,17,30.9v2.3c0,2.4,0.3,4.9,0.3,4.9s0.3,2.1,1.2,3 c1.1,1.2,2.6,1.2,3.3,1.3c2.4,0.2,10.2,0.3,10.2,0.3s6.3,0,10.5-0.3c0.6-0.1,1.9-0.1,3-1.3c0.9-0.9,1.2-3,1.2-3s0.3-2.4,0.3-4.9 v-2.3C47,28.4,46.7,26,46.7,26z M28.9,35.9l0-8.4l8.1,4.2L28.9,35.9z"></path></symbol><symbol id="youtube-unauth-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M47,33.1c0,2.4-0.3,4.9-0.3,4.9s-0.3,2.1-1.2,3c-1.1,1.2-2.4,1.2-3,1.3 C38.3,42.5,32,42.6,32,42.6s-7.8-0.1-10.2-0.3c-0.7-0.1-2.2-0.1-3.3-1.3c-0.9-0.9-1.2-3-1.2-3S17,35.6,17,33.1v-2.3 c0-2.4,0.3-4.9,0.3-4.9s0.3-2.1,1.2-3c1.1-1.2,2.4-1.2,3-1.3c4.2-0.3,10.5-0.3,10.5-0.3h0c0,0,6.3,0,10.5,0.3c0.6,0.1,1.9,0.1,3,1.3 c0.9,0.9,1.2,3,1.2,3s0.3,2.4,0.3,4.9V33.1z M28.9,35.9l8.1-4.2l-8.1-4.2L28.9,35.9z"></path></symbol><symbol id="x-formerly-twitter-unauth-icon" viewBox="0 0 64 64"><g class="svg-icon"><path d="M34.426 29.9327L43.9189 18.5H41.6694L33.4267 28.4268L26.8432 18.5H19.25L29.2055 33.5111L19.25 45.5H21.4997L30.2042 35.0169L37.1568 45.5H44.75L34.426 29.9327ZM22.3102 20.2546H25.7656L41.6704 43.8252H38.2151L22.3102 20.2546Z"></path></g></symbol><symbol id="x-formerly-twitter-unauth-mask" viewBox="0 0 64 64"><g class="svg-mask"><path d="M38.2151 43.8252H41.6704L25.7656 20.2546H22.3102L38.2151 43.8252Z"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M0 0H64V64H0V0ZM43.9189 18.5L34.426 29.9327L44.75 45.5H37.1568L30.2042 35.0169L21.4997 45.5H19.25L29.2055 33.5111L19.25 18.5H26.8432L33.4267 28.4268L41.6694 18.5H43.9189Z"></path></g></symbol><symbol id="twitter-unauth-icon" viewBox="0 0 64 64"><path d="M48,22.1c-1.2,0.5-2.4,0.9-3.8,1c1.4-0.8,2.4-2.1,2.9-3.6c-1.3,0.8-2.7,1.3-4.2,1.6 C41.7,19.8,40,19,38.2,19c-3.6,0-6.6,2.9-6.6,6.6c0,0.5,0.1,1,0.2,1.5c-5.5-0.3-10.3-2.9-13.5-6.9c-0.6,1-0.9,2.1-0.9,3.3 c0,2.3,1.2,4.3,2.9,5.5c-1.1,0-2.1-0.3-3-0.8c0,0,0,0.1,0,0.1c0,3.2,2.3,5.8,5.3,6.4c-0.6,0.1-1.1,0.2-1.7,0.2c-0.4,0-0.8,0-1.2-0.1 c0.8,2.6,3.3,4.5,6.1,4.6c-2.2,1.8-5.1,2.8-8.2,2.8c-0.5,0-1.1,0-1.6-0.1c2.9,1.9,6.4,2.9,10.1,2.9c12.1,0,18.7-10,18.7-18.7 c0-0.3,0-0.6,0-0.8C46,24.5,47.1,23.4,48,22.1z"></path></symbol><symbol id="twitter-unauth-mask" viewBox="0 0 64 64"><path d="M0,0v64h64V0H0z M44.7,25.5c0,0.3,0,0.6,0,0.8C44.7,35,38.1,45,26.1,45c-3.7,0-7.2-1.1-10.1-2.9 c0.5,0.1,1,0.1,1.6,0.1c3.1,0,5.9-1,8.2-2.8c-2.9-0.1-5.3-2-6.1-4.6c0.4,0.1,0.8,0.1,1.2,0.1c0.6,0,1.2-0.1,1.7-0.2 c-3-0.6-5.3-3.3-5.3-6.4c0,0,0-0.1,0-0.1c0.9,0.5,1.9,0.8,3,0.8c-1.8-1.2-2.9-3.2-2.9-5.5c0-1.2,0.3-2.3,0.9-3.3 c3.2,4,8.1,6.6,13.5,6.9c-0.1-0.5-0.2-1-0.2-1.5c0-3.6,2.9-6.6,6.6-6.6c1.9,0,3.6,0.8,4.8,2.1c1.5-0.3,2.9-0.8,4.2-1.6 c-0.5,1.5-1.5,2.8-2.9,3.6c1.3-0.2,2.6-0.5,3.8-1C47.1,23.4,46,24.5,44.7,25.5z"></path></symbol><symbol id="email-icon" viewBox="0 0 64 64"><path d="M17,22v20h30V22H17z M41.1,25L32,32.1L22.9,25H41.1z M20,39V26.6l12,9.3l12-9.3V39H20z"></path></symbol><symbol id="email-mask" viewBox="0 0 64 64"><path d="M41.1,25H22.9l9.1,7.1L41.1,25z M44,26.6l-12,9.3l-12-9.3V39h24V26.6z M0,0v64h64V0H0z M47,42H17V22h30V42z"></path></symbol>`;

    document.addEventListener("DOMContentLoaded", () => {
      const svgElement = document.querySelector(
        'svg[data-usage="social-icons-svg"]'
      );
      if (svgElement) {
        svgElement.innerHTML = socialInnerHTML;
      }
    });
  }
  headerSizing() {
    const rect = this.header.getBoundingClientRect();
    this.root.style.setProperty(
      "--wM-headerBottom",
      Math.max(0, rect.bottom) + "px"
    );
    this.root.style.setProperty("--wM-headerHeight", rect.height + "px");
  }

  addScrollEventListener() {
    if (!this.isSticky) return;
  
    // Get initial position of the nav
    const navOffset = this.plugin.offsetTop;
    
    // Set initial height of placeholder
    this.stickyWrapper.style.height = `${this.plugin.offsetHeight}px`;
    
    // Insert placeholder before the plugin
    this.plugin.parentNode.insertBefore(this.stickyWrapper, this.plugin.nextSibling);
  
    const handleScroll = () => {
      if (window.pageYOffset > navOffset) {
        this.plugin.classList.add('is-sticky');
        this.stickyWrapper.style.display = 'block';
      } else {
        this.plugin.classList.remove('is-sticky');
        this.stickyWrapper.style.display = 'none';
      }
    };
  
    // Add scroll listener
    window.addEventListener('scroll', handleScroll);
    
    // Initial check in case page loads scrolled
    handleScroll();
  }
  
  placeNav() {
    // const desktopPositioning = this.el.dataset.desktopPosition || "top";
    // const desktopLayout = this.el.dataset.desktopLayout || "nav-right";
    // let mobilePositioning = this.el.dataset.mobilePosition || "overlay-bottom";
    // const sticky = this.el.dataset.sticky || "false";
    const desktopPositioning = this.settings.desktopPosition;
    const desktopLayout = this.settings.desktopLayout;
    let mobilePositioning = this.settings.mobilePosition;
    const sticky = this.settings.sticky;

    const mobileNav = document.querySelector(".header-display-mobile");
    // mobileNav.setAttribute("data-wm-plugin", "secondary-nav");

    const mobileOverlayNavContent = document.querySelector(
      ".header-menu-nav-folder-content"
    );
    // mobileOverlayNavContent.setAttribute("data-wm-plugin", "secondary-nav");

    const mobileLogo = document.querySelector(
      ".header-display-mobile .header-title-nav-wrapper"
    );

    const overlaySocialLinks = document.querySelector(
      ".header-menu .social-accounts"
    );

    const overlayButton = document.querySelector(
      ".header-menu .header-menu-cta"
    );

    const accountLogin = document.querySelector(
      ".header-menu .user-accounts-link"
    );

    const mobileCart = document.querySelector(
      ".showOnMobile .header-actions-action--cart"
    );

    const showOnMobile = document.querySelector(
      ".header-display-mobile .showOnMobile"
    );

    const headerInner = document.querySelector(".header-inner");

    const mobileBrandingWrapper = this.brandingWrapper.cloneNode(true);

    if (desktopPositioning === "top") {
      const dropzone = document.querySelector(".sqs-announcement-bar-dropzone");
      dropzone.insertAdjacentElement("afterend", this.plugin);
    } else if (desktopPositioning === "bottom") {
      const dropzone = document.querySelector(
        ".header-announcement-bar-wrapper"
      );
      dropzone.insertAdjacentElement("afterend", this.plugin);
    } else if (desktopPositioning === "section") {
      const section = this.el.closest(".page-section");
      mobilePositioning = "static";
      section.querySelector(".content-wrapper").appendChild(this.plugin);
      section.classList.add("secondary-nav-section");
      // section.insertAdjacentElement("afterend", this.plugin);
      // section.remove();

      if (sticky === "true") {
        this.plugin.classList.add("sticky");
      }
    }

    if (mobilePositioning === "overlay-top") {
      const dropzone = document.querySelector(
        ".header-menu-nav-folder-content"
      );
      dropzone.insertAdjacentElement("afterbegin", this.mobileLinks);

      mobileNav.classList.add("secondary-mobile-nav");
      mobileLogo.insertAdjacentElement("afterbegin", mobileBrandingWrapper);

      if (overlaySocialLinks && this.mobileSocialLinkWrapper) {
        overlaySocialLinks.insertAdjacentElement(
          "beforebegin",
          this.mobileSocialLinkWrapper
        );
      } else if (!overlaySocialLinks && this.mobileSocialLinkWrapper) {
        mobileOverlayNavContent.insertAdjacentElement(
          "afterend",
          this.mobileSocialLinkWrapper
        );
      }

      if (overlayButton && this.mobileButtonWrapper) {
        overlayButton.insertAdjacentElement(
          "beforebegin",
          this.mobileButtonWrapper
        );
      } else if (!overlayButton && this.mobileButtonWrapper) {
        const socialChecks = document.querySelectorAll(".social-accounts");
        if (socialChecks.length > 0) {
          socialChecks[socialChecks.length - 1].insertAdjacentElement(
            "afterend",
            this.mobileButtonWrapper
          );
        } else {
          mobileOverlayNavContent.insertAdjacentElement(
            "afterend",
            this.mobileButtonWrapper
          );
        }
      }

      if (!accountLogin && this.mobileLoginWrapper) {
        mobileOverlayNavContent.appendChild(this.mobileLoginWrapper);
      }

      if (!mobileCart && this.mobileCartWrapper) {
        showOnMobile.appendChild(this.mobileCartWrapper);
        headerInner.classList.add("header-layout--with-commerce");
      }
    } else if (mobilePositioning === "overlay-bottom") {
      const dropzone = document.querySelector(".header-menu-nav-wrapper");
      dropzone.insertAdjacentElement("beforeend", this.mobileLinks);

      mobileNav.classList.add("secondary-mobile-nav");
      mobileLogo.insertAdjacentElement("beforeend", mobileBrandingWrapper);

      if (overlaySocialLinks && this.mobileSocialLinkWrapper) {
        overlaySocialLinks.insertAdjacentElement(
          "afterend",
          this.mobileSocialLinkWrapper
        );
      } else if (!overlaySocialLinks && this.mobileSocialLinkWrapper) {
        mobileOverlayNavContent.insertAdjacentElement(
          "afterend",
          this.mobileSocialLinkWrapper
        );
      }

      if (overlayButton && this.mobileButtonWrapper) {
        overlayButton.insertAdjacentElement(
          "afterend",
          this.mobileButtonWrapper
        );
      } else if (!overlayButton && this.mobileButtonWrapper) {
        const socialChecks = document.querySelectorAll(".social-accounts");
        if (socialChecks.length > 0) {
          socialChecks[socialChecks.length - 1].insertAdjacentElement(
            "afterend",
            this.mobileButtonWrapper
          );
        } else {
          mobileOverlayNavContent.insertAdjacentElement(
            "afterend",
            this.mobileButtonWrapper
          );
        }
      }

      if (!accountLogin && this.mobileLoginWrapper) {
        mobileOverlayNavContent.appendChild(this.mobileLoginWrapper);
      }

      if (!mobileCart && this.mobileCartWrapper) {
        showOnMobile.appendChild(this.mobileCartWrapper);
        headerInner.classList.add("header-layout--with-commerce");
      }
    } else if (mobilePositioning === "static") {
      this.plugin.classList.add("static");
    }

    this.setActiveLinks();
  }

  setActiveLinks() {
  //Add Active Class if on Page
  let activeClass = 'header-nav-item--active',
    dropdownActiveClass = 'header-nav-folder-item--active',
    pathName = window.location.pathname,
    newLinks = document.querySelectorAll('.secondary-links .header-nav-item');

  newLinks.forEach(link => {
    let href = link.querySelector('a:not(.header-nav-folder-title)') || link.querySelector('a');
    if (pathName == href.getAttribute('href')) {
      link.classList.add(activeClass);
    }
  });

  // Handle dropdown items
  let dropdownItems = document.querySelectorAll('.secondary-links .header-nav-folder-item');
  dropdownItems.forEach(item => {
    let href = item.querySelector('a');
    if (href && pathName == href.getAttribute('href')) {
      item.classList.add(dropdownActiveClass);
    }
  });
}


  deepMerge(...objs) {
    function getType(obj) {
      return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
    }
    function mergeObj(clone, obj) {
      for (let [key, value] of Object.entries(obj)) {
        let type = getType(value);
        if (type === "object" || type === "array") {
          if (clone[key] === undefined) {
            clone[key] = type === "object" ? {} : [];
          }
          mergeObj(clone[key], value); // Corrected recursive call
        } else if (type === "function") {
          clone[key] = value; // Directly reference the function
        } else {
          clone[key] = value;
        }
      }
    }
    if (objs.length === 0) {
      return {};
    }
    let clone = {};
    objs.forEach(obj => {
      mergeObj(clone, obj);
    });
    return clone;
  }

  get instanceSettings() {
    const dataAttributes = {};
    // Function to set value in a nested object based on key path
    const setNestedProperty = (obj, keyPath, value) => {
      const keys = keyPath.split("__");
      let current = obj;

      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          current[key] = this.parseAttr(value);
        } else {
          current = current[key] = current[key] || {};
        }
      });
    };

    for (let [attrName, value] of Object.entries(this.el.dataset)) {
      setNestedProperty(dataAttributes, attrName, value);
    }
    return dataAttributes;
  }
  parseAttr(string) {
    if (string === "true") return true;
    if (string === "false") return false;
    const number = parseFloat(string);
    if (!isNaN(number) && number.toString() === string) return number;
    return string;
  }
  emitEvent(type, detail = {}, elem = document) {
    // Make sure there's an event type
    if (!type) return;

    // Create a new event
    let event = new CustomEvent(type, {
      bubbles: true,
      cancelable: true,
      detail: detail,
    });

    // Dispatch the event
    return elem.dispatchEvent(event);
  }
}

(() => {
  function initSecondaryNav() {
    const els = document.querySelectorAll(
      "SecondaryNav:not([data-loading-state])"
    );

    if (!els.length) return;
    els.forEach(el => {
      el.dataset.loadingState = "loading";
      el.wmSecondaryNav = new SecondaryNav(el);
    });
  }
  window.wmSecondaryNav = {
    init: () => initSecondaryNav(),
  };
  window.wmSecondaryNav.init();
})();
