// ------------------------------------------------------------
// Render builder
// ------------------------------------------------------------

function renderHomepageSections() {

  const container =
    document.getElementById(
      "homepageSections"
    );

  if (!container) return;

  container.innerHTML = "";

  homepageSections.forEach(
    (section, sectionIndex) => {

      const wrapper =
        document.createElement("div");

      wrapper.className =
        "homepage-admin-section";

      wrapper.style.cssText = `
        border:1px solid var(--border);
        border-radius:10px;
        padding:18px;
        margin:16px 0;
      `;

      wrapper.innerHTML = `
        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
            flex-wrap:wrap;
            margin-bottom:16px;
          "
        >

          <strong>
            Section ${sectionIndex + 1}
          </strong>

          <div style="display:flex;gap:6px">

            <button
              type="button"
              class="btn btn--ghost move-up"
            >
              ↑
            </button>

            <button
              type="button"
              class="btn btn--ghost move-down"
            >
              ↓
            </button>

            <button
              type="button"
              class="btn btn--ghost duplicate-section"
            >
              Duplicate
            </button>

            <button
              type="button"
              class="btn btn--ghost remove-section"
            >
              Remove
            </button>

          </div>

        </div>


        <div class="form-group">

          <label>
            Enabled
          </label>

          <input
            type="checkbox"
            class="section-enabled"
            ${section.enabled !== false ? "checked" : ""}
          >

        </div>


        <div class="form-group">

          <label>
            Section Type
          </label>

          <select class="section-type">

            <option
              value="features"
              ${section.type === "features" ? "selected" : ""}
            >
              Featured Grid
            </option>

            <option
              value="cards"
              ${section.type === "cards" ? "selected" : ""}
            >
              Cards
            </option>

            <option
              value="text"
              ${section.type === "text" ? "selected" : ""}
            >
              Text / Paragraphs
            </option>

          </select>

        </div>


        <div class="form-group">

          <label>
            Section Title
          </label>

          <input
            type="text"
            class="section-title"
            value="${homepageEscape(section.title)}"
          >

        </div>


        <div class="form-group">

          <label>
            Section Subtitle
          </label>

          <input
            type="text"
            class="section-subtitle"
            value="${homepageEscape(section.subtitle)}"
          >

        </div>


        <div class="form-group">

          <label>
            Section Description
          </label>

          <textarea
            class="section-description"
            rows="3"
          >${homepageEscape(section.description)}</textarea>

        </div>


        <div class="form-group">

          <label>
            Alignment
          </label>

          <select class="section-alignment">

            <option
              value="left"
              ${section.alignment === "left" ? "selected" : ""}
            >
              Left
            </option>

            <option
              value="center"
              ${section.alignment === "center" ? "selected" : ""}
            >
              Center
            </option>

            <option
              value="right"
              ${section.alignment === "right" ? "selected" : ""}
            >
              Right
            </option>

          </select>

        </div>


        <div class="form-group">

          <label>
            Background Color
          </label>

          <input
            type="text"
            class="section-background-color"
            value="${homepageEscape(section.backgroundColor)}"
            placeholder="#111827 or rgba(...)"
          >

        </div>


        <div class="form-group">

          <label>
            Background Image URL
          </label>

          <input
            type="url"
            class="section-background-image"
            value="${homepageEscape(section.backgroundImage)}"
            placeholder="https://..."
          >

        </div>


        <div class="form-group">

          <label>
            Text Color
          </label>

          <input
            type="text"
            class="section-text-color"
            value="${homepageEscape(section.textColor)}"
            placeholder="#ffffff"
          >

        </div>


        <div class="form-group">

          <label>
            Button Text
          </label>

          <input
            type="text"
            class="section-button-text"
            value="${homepageEscape(section.buttonText)}"
          >

        </div>


        <div class="form-group">

          <label>
            Button URL
          </label>

          <input
            type="text"
            class="section-button-url"
            value="${homepageEscape(section.buttonUrl)}"
          >

        </div>


        <div class="form-group">

          <label>
            Button Style
          </label>

          <select class="section-button-style">

            <option
              value="primary"
              ${section.buttonStyle === "primary" ? "selected" : ""}
            >
              Primary
            </option>

            <option
              value="ghost"
              ${section.buttonStyle === "ghost" ? "selected" : ""}
            >
              Ghost
            </option>

          </select>

        </div>


        <h3>
          Paragraphs
        </h3>

        <div class="section-paragraphs"></div>

        <button
          type="button"
          class="btn btn--ghost add-paragraph"
        >
          + Add Paragraph
        </button>


        <h3 style="margin-top:24px">
          Cards
        </h3>

        <div class="section-cards"></div>

        <button
          type="button"
          class="btn btn--ghost add-card"
        >
          + Add Card
        </button>
      `;


      // ------------------------------------------------------
      // Paragraphs
      // ------------------------------------------------------

      const paragraphsContainer =
        wrapper.querySelector(
          ".section-paragraphs"
        );

      (section.paragraphs || [])
        .forEach(
          (paragraph, paragraphIndex) => {

            const row =
              document.createElement("div");

            row.style.cssText = `
              display:flex;
              gap:8px;
              margin-bottom:8px;
            `;

            row.innerHTML = `
              <textarea
                rows="3"
                style="flex:1"
                class="paragraph-input"
              >${homepageEscape(paragraph)}</textarea>

              <button
                type="button"
                class="btn btn--ghost remove-paragraph"
              >
                Remove
              </button>
            `;

            row
              .querySelector(
                ".remove-paragraph"
              )
              .addEventListener(
                "click",
                () => {

                  section.paragraphs
                    .splice(
                      paragraphIndex,
                      1
                    );

                  renderHomepageSections();
                }
              );

            paragraphsContainer
              .appendChild(row);
          }
        );


      // ------------------------------------------------------
      // Cards
      // ------------------------------------------------------

      const cardsContainer =
        wrapper.querySelector(
          ".section-cards"
        );


      (section.cards || [])
        .forEach(
          (card, cardIndex) => {

            const cardElement =
              document.createElement("div");

            cardElement.style.cssText = `
              border:1px solid var(--border);
              border-radius:8px;
              padding:16px;
              margin:12px 0;
            `;

            cardElement.innerHTML = `

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  margin-bottom:12px;
                "
              >

                <strong>
                  Card ${cardIndex + 1}
                </strong>

                <button
                  type="button"
                  class="btn btn--ghost remove-card"
                >
                  Remove
                </button>

              </div>


              <div class="form-group">

                <label>
                  Enabled
                </label>

                <input
                  type="checkbox"
                  class="card-enabled"
                  ${card.enabled !== false ? "checked" : ""}
                >

              </div>


              <div class="form-group">

                <label>
                  Title
                </label>

                <input
                  type="text"
                  class="card-title"
                  value="${homepageEscape(card.title)}"
                >

              </div>


              <div class="form-group">

                <label>
                  Content
                </label>

                <textarea
                  rows="3"
                  class="card-text"
                >${homepageEscape(card.text)}</textarea>

              </div>


              <div class="form-group">

                <label>
                  Icon Type
                </label>

                <select class="card-icon-type">

                  <option
                    value="icon"
                    ${card.iconType === "icon" ? "selected" : ""}
                  >
                    Text / Emoji / Symbol
                  </option>

                  <option
                    value="image"
                    ${card.iconType === "image" ? "selected" : ""}
                  >
                    Image URL
                  </option>

                </select>

              </div>


              <div class="form-group">

                <label>
                  Icon / Symbol
                </label>

                <input
                  type="text"
                  class="card-icon"
                  value="${homepageEscape(card.icon)}"
                  placeholder="★ 🔒 🌐"
                >

              </div>


              <div class="form-group">

                <label>
                  Icon Image URL
                </label>

                <input
                  type="url"
                  class="card-image-url"
                  value="${homepageEscape(card.imageUrl)}"
                  placeholder="https://..."
                >

              </div>


              <div class="form-group">

                <label>
                  Card URL
                </label>

                <input
                  type="text"
                  class="card-url"
                  value="${homepageEscape(card.url)}"
                  placeholder="/en/review/example"
                >

              </div>


              <div class="form-group">

                <label>
                  Open Link
                </label>

                <select class="card-target">

                  <option
                    value="_self"
                    ${card.target !== "_blank" ? "selected" : ""}
                  >
                    Same Window
                  </option>

                  <option
                    value="_blank"
                    ${card.target === "_blank" ? "selected" : ""}
                  >
                    New Window
                  </option>

                </select>

              </div>


              <div class="form-group">

                <label>
                  Card Background Color
                </label>

                <input
                  type="text"
                  class="card-background-color"
                  value="${homepageEscape(card.backgroundColor)}"
                  placeholder="#111827"
                >

              </div>


              <div class="form-group">

                <label>
                  Card Background Image URL
                </label>

                <input
                  type="url"
                  class="card-background-image"
                  value="${homepageEscape(card.backgroundImage)}"
                  placeholder="https://..."
                >

              </div>


              <div class="form-group">

                <label>
                  Card Text Color
                </label>

                <input
                  type="text"
                  class="card-text-color"
                  value="${homepageEscape(card.textColor)}"
                  placeholder="#ffffff"
                >

              </div>


              <div class="form-group">

                <label>
                  Icon Color
                </label>

                <input
                  type="text"
                  class="card-icon-color"
                  value="${homepageEscape(card.iconColor)}"
                  placeholder="#ffffff"
                >

              </div>
            `;


            cardElement
              .querySelector(
                ".remove-card"
              )
              .addEventListener(
                "click",
                () => {

                  section.cards
                    .splice(
                      cardIndex,
                      1
                    );

                  renderHomepageSections();
                }
              );


            cardsContainer
              .appendChild(
                cardElement
              );
          }
        );


      // ------------------------------------------------------
      // Section controls
      // ------------------------------------------------------

      wrapper
        .querySelector(
          ".remove-section"
        )
        .addEventListener(
          "click",
          () => {

            homepageSections
              .splice(
                sectionIndex,
                1
              );

            renderHomepageSections();
          }
        );


      wrapper
        .querySelector(
          ".duplicate-section"
        )
        .addEventListener(
          "click",
          () => {

            const copy =
              JSON.parse(
                JSON.stringify(section)
              );

            copy.id =
              homepageId("section");

            homepageSections
              .splice(
                sectionIndex + 1,
                0,
                copy
              );

            renderHomepageSections();
          }
        );


      wrapper
        .querySelector(
          ".move-up"
        )
        .addEventListener(
          "click",
          () => {

            if (sectionIndex === 0)
              return;

            [
              homepageSections[
                sectionIndex - 1
              ],
              homepageSections[
                sectionIndex
              ]
            ] = [
              homepageSections[
                sectionIndex
              ],
              homepageSections[
                sectionIndex - 1
              ]
            ];

            renderHomepageSections();
          }
        );


      wrapper
        .querySelector(
          ".move-down"
        )
        .addEventListener(
          "click",
          () => {

            if (
              sectionIndex >=
              homepageSections.length - 1
            ) return;

            [
              homepageSections[
                sectionIndex + 1
              ],
              homepageSections[
                sectionIndex
              ]
            ] = [
              homepageSections[
                sectionIndex
              ],
              homepageSections[
                sectionIndex + 1
              ]
            ];

            renderHomepageSections();
          }
        );


      wrapper
        .querySelector(
          ".add-paragraph"
        )
        .addEventListener(
          "click",
          () => {

            section.paragraphs =
              section.paragraphs || [];

            section.paragraphs.push(
              "New paragraph..."
            );

            renderHomepageSections();
          }
        );


      wrapper
        .querySelector(
          ".add-card"
        )
        .addEventListener(
          "click",
          () => {

            section.cards =
              section.cards || [];

            section.cards.push(
              createHomepageCard()
            );

            renderHomepageSections();
          }
        );


      container.appendChild(
        wrapper
      );
    }
  );
}

