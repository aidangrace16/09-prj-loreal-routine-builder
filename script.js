// System prompt: guides the chatbot to only answer questions about L'Oréal products, routines, and recommendations
const systemPrompt = {
  role: "system",
  content: `You are the L’Oréal Skincare & Makeup Routine Assistant, a virtual beauty expert dedicated to helping users build personalized daily routines using selected L’Oréal products. Follow these instructions to ensure a seamless, engaging, and helpful experience:
Always greet users warmly and offer clear guidance on how to interact with you.
Ask relevant questions to understand the user’s skin type, concerns, and preferences before recommending routine steps.
Use the list of selected L’Oréal skincare and makeup products the user provides as the basis to create tailored step-by-step routines combining skincare and makeup when appropriate.
Provide simple, jargon-free explanations about product benefits, application order, and timing.
Use a friendly, approachable tone consistent with the L’Oréal brand—professional yet warm and encouraging.
Guide users naturally through the routine creation process, offering options or suggestions but respecting user choices.
Anticipate common questions the user may have and proactively clarify routine details or product use tips.
Be context-aware; remember user preferences and previous inputs during the conversation for a personalized experience.
If you encounter unknown or unsupported queries (for example queries that aren't relevat to beauty, such as "what is 2+2?" or "Who was the most important figure in the 1700s?"), politely set expectations, offer alternatives, or safely escalate if necessary.
Maintain an accessible, clear, and visually pleasant interaction style suitable for all users.
Your goal is to make routine creation effortless and enjoyable, leading users to confident, informed beauty choices with their L’Oréal products.
All L’Oréal-owned products are welcomed to be talked about, such as Cerave, etc.
Naturally incorporate beauty-relevant emojis (such as 💄, 💇‍♀️, 🧴, 💧, ✨) to emphasize products, steps, or to add a fun touch, but avoid overusing the same emoji within a single message.
You can use other emojis too to enhance the conversation.`,
};

// Store the conversation history
const messages = [systemPrompt];

// Get DOM elements
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const categoryFilter = document.getElementById("categoryFilter");
const searchFilter = document.getElementById("searchFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const sendBtn = document.getElementById("sendBtn");

// Get the "Generate Routine" button
const generateRoutineButton = document.getElementById("generateRoutine");
const clearAllBtn = document.getElementById("clearAllBtn");

// localStorage key for saving products
const STORAGE_KEY = "loreal_selected_products";

// Keep track of selected products
let selectedProducts = [];

// --- localStorage Functions ---

// Function to save selected products to localStorage
function saveSelectedProductsToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedProducts));
}

// Function to load selected products from localStorage
function loadSelectedProductsFromStorage() {
  const storedProducts = localStorage.getItem(STORAGE_KEY);
  if (storedProducts) {
    selectedProducts = JSON.parse(storedProducts);
  }
}

// Add this style to chatWindow for vertical stacking
chatWindow.style.display = "flex";
chatWindow.style.flexDirection = "column";

// Show initial greeting from the chatbot
chatWindow.innerHTML = `<div class="msg ai">👋 Hello! How can I help you with L'Oréal products or routines today?</div>`;

// Show initial placeholder until user selects a category
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

// Load product data from JSON file
async function loadProducts() {
  try {
    const response = await fetch("products.json");
    const data = await response.json();
    return data.products;
  } catch (error) {
    console.error("Error loading products:", error);
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Unable to load products. Please try again later.
      </div>
    `;
    return [];
  }
}

// Create HTML for displaying product cards
function displayProducts(products) {
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found for this category.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-id="${product.id}" data-name="${product.name}" data-brand="${product.brand}" data-image="${product.image}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <div class="product-overlay">
        <p>${product.description}</p>
      </div>
    </div>
  `
    )
    .join("");

  // Add click event listeners to all product cards
  document.querySelectorAll(".product-card").forEach((card) => {
    // Check if product is already selected and apply selected class
    const productId = parseInt(card.dataset.id);
    if (selectedProducts.some((product) => product.id === productId)) {
      card.classList.add("selected");
    }

    card.addEventListener("click", handleProductSelection);
  });
}

// Combined function to filter and display products
async function filterAndDisplayProducts() {
  const products = await loadProducts();
  const selectedCategory = categoryFilter.value;
  const searchTerm = searchFilter.value.toLowerCase().trim();

  // If the category is the initial default and there's no search term, show the placeholder.
  if (searchTerm == "") {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Select a category to view products
      </div>
    `;
    return;
  }

  // Start with all products
  let filteredProducts = products;

  // 1. Filter by category
  if (selectedCategory && selectedCategory !== "all") {
    filteredProducts = filteredProducts.filter(
      (product) => product.category === selectedCategory
    );
  }

  // 2. Filter by search term
  if (searchTerm) {
    filteredProducts = filteredProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.brand.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
    );
  }

  displayProducts(filteredProducts);
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", filterAndDisplayProducts);

/* Filter and display products when user types in search field */
searchFilter.addEventListener("input", filterAndDisplayProducts);

// Listen for form submit
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get user's message
  const userMsg = userInput.value.trim();
  if (!userMsg) return;

  // Disable form elements while processing
  sendBtn.disabled = true;

  // Add user's message to messages array
  messages.push({ role: "user", content: userMsg });

  // Show user's message in chat window
  chatWindow.innerHTML += `<div class="msg user">${userMsg}</div>`;

  // Clear input field
  userInput.value = "";

  // Show loading message
  chatWindow.innerHTML += `<div class="msg ai">Thinking...</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    // Send messages array to Cloudflare Worker (OpenAI API)
    const response = await fetch(
      "https://the-worker.aidanggrace.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      }
    );

    // Parse the response
    const data = await response.json();

    // Get the chatbot's reply
    const aiMsg = data.choices[0].message.content;

    // Add AI message to messages array
    messages.push({ role: "assistant", content: aiMsg });

    // Convert Markdown bold to HTML
    const aiMsgHtml = markdownToHtml(aiMsg);

    // Remove loading message and show AI reply with animation
    const msgs = chatWindow.querySelectorAll(".msg.ai");
    let aiMsgDiv;
    if (msgs.length) {
      aiMsgDiv = msgs[msgs.length - 1];
      aiMsgDiv.innerHTML = ""; // Clear loading text
    } else {
      chatWindow.innerHTML += `<div class="msg ai"></div>`;
      aiMsgDiv =
        chatWindow.querySelectorAll(".msg.ai")[
          chatWindow.querySelectorAll(".msg.ai").length - 1
        ];
    }
    typeText(aiMsgDiv, aiMsgHtml, 9, () => {
      // Re-enable form elements after response is typed
      sendBtn.disabled = false;
      userInput.focus();
    }); // Animate response (faster)

    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (err) {
    // Show error message
    chatWindow.innerHTML += `<div class="msg ai">Sorry, there was a problem connecting to the chatbot.</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
    // Re-enable form elements on error
    sendBtn.disabled = false;
  }
});

// Handle product selection
function handleProductSelection(e) {
  const card = e.currentTarget;
  const productId = parseInt(card.dataset.id);
  const productName = card.dataset.name;
  const productBrand = card.dataset.brand;
  const productImage = card.dataset.image;

  // Check if product is already selected
  const existingIndex = selectedProducts.findIndex(
    (product) => product.id === productId
  );

  if (existingIndex > -1) {
    // Product is already selected, remove it
    selectedProducts.splice(existingIndex, 1);
    card.classList.remove("selected");
  } else {
    // Product is not selected, add it
    selectedProducts.push({
      id: productId,
      name: productName,
      brand: productBrand,
      image: productImage,
    });
    card.classList.add("selected");
  }

  // Update selected products list and save to localStorage
  updateSelectedProductsList();
  saveSelectedProductsToStorage();
}

// Update the selected products list display
function updateSelectedProductsList() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = "<p>No products selected</p>";
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
    <div class="selected-product" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="selected-product-info">
        <p>${product.name}</p>
        <p class="brand">${product.brand}</p>
      </div>
      <button class="remove-product" aria-label="Remove ${product.name}">
        <i class="fa-solid fa-times"></i>
      </button>
    </div>
  `
    )
    .join("");

  // Add event listeners to remove buttons
  document.querySelectorAll(".remove-product").forEach((button) => {
    button.addEventListener("click", handleRemoveProduct);
  });
}

// Handle removing a product from the selected list
function handleRemoveProduct(e) {
  e.stopPropagation(); // Prevent event bubbling

  const selectedProduct = e.currentTarget.closest(".selected-product");
  const productId = parseInt(selectedProduct.dataset.id);

  // Remove from selectedProducts array
  const index = selectedProducts.findIndex(
    (product) => product.id === productId
  );
  if (index > -1) {
    selectedProducts.splice(index, 1);
  }

  // Update selected products list and save to localStorage
  updateSelectedProductsList();
  saveSelectedProductsToStorage();

  // Find and update corresponding product card in the grid, if visible
  const productCard = document.querySelector(
    `.product-card[data-id="${productId}"]`
  );
  if (productCard) {
    productCard.classList.remove("selected");
  }
}

// Initialize the app by loading products from storage and updating the list
loadSelectedProductsFromStorage();
updateSelectedProductsList();

// Helper function to convert Markdown bold (**text**) to HTML <strong>text</strong>
function markdownToHtml(text) {
  // Replace **text** with <strong>text</strong>
  return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

// Helper function to animate chatbot text
function typeText(element, htmlText, speed = 9, callback) {
  // Split the HTML into text and tags
  let i = 0;
  let isTag = false;
  let output = "";
  function type() {
    if (i < htmlText.length) {
      if (htmlText[i] === "<") isTag = true;
      if (isTag) {
        // Add full tag at once
        let tag = "";
        while (htmlText[i] !== ">" && i < htmlText.length) {
          tag += htmlText[i];
          i++;
        }
        tag += ">";
        output += tag;
        i++;
        isTag = false;
      } else {
        output += htmlText[i];
        i++;
      }
      element.innerHTML = output + '<span class="blinker">|</span>';
      setTimeout(type, speed);
    } else {
      element.innerHTML = output; // Remove blinker at end
      if (callback) {
        callback();
      }
    }
  }
  type();
}

// Listen for clicks on the "Clear All" button
clearAllBtn.addEventListener("click", () => {
  // Clear the selected products array
  selectedProducts = [];

  // Update the list display (will show "No products selected")
  updateSelectedProductsList();

  // Remove from localStorage
  saveSelectedProductsToStorage();

  // Remove the 'selected' class from all product cards
  document.querySelectorAll(".product-card.selected").forEach((card) => {
    card.classList.remove("selected");
  });
});

// Listen for clicks on the "Generate Routine" button
generateRoutineButton.addEventListener("click", async () => {
  // Remove any existing temporary warning message
  const tempWarning = document.getElementById("temp-warning");
  if (tempWarning) {
    tempWarning.remove();
  }

  if (selectedProducts.length === 0) {
    // Show a temporary warning message in the chat window
    chatWindow.innerHTML += `<div class="msg ai temp-warning" id="temp-warning">Please select some products to generate a routine! 😊</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return;
  }

  // Disable buttons and input while generating routine
  generateRoutineButton.disabled = true;
  sendBtn.disabled = true;

  // Collect selected product data
  const productData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  // Show loading message in the chat window, replacing the temp warning if it exists
  chatWindow.innerHTML += `<div class="msg ai">Generating your routine... ✨</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    // Send product data to the OpenAI API
    const response = await fetch(
      "https://the-worker.aidanggrace.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            ...messages,
            {
              role: "user",
              content: `Here are the selected products: ${JSON.stringify(
                productData
              )}. Please create a beauty routine using these products.`,
            },
          ],
        }),
      }
    );

    // Parse the response
    const data = await response.json();
    const routine = data.choices[0].message.content;

    // Convert Markdown bold to HTML
    const routineHtml = markdownToHtml(routine);

    // Get the last AI message bubble (the loading one)
    const msgs = chatWindow.querySelectorAll(".msg.ai");
    const aiMsgDiv = msgs[msgs.length - 1];

    // Clear the loading message and type out the new response
    aiMsgDiv.innerHTML = "";
    typeText(aiMsgDiv, routineHtml, 6, () => {
      // Re-enable buttons and input after routine is generated
      generateRoutineButton.disabled = false;
      sendBtn.disabled = false;
    }); // Animate response

    chatWindow.scrollTop = chatWindow.scrollHeight;

    // Add the routine to the conversation history
    messages.push({ role: "assistant", content: routine });
  } catch (error) {
    console.error("Error generating routine:", error);
    // Find the loading message and replace it with an error message
    const msgs = chatWindow.querySelectorAll(".msg.ai");
    if (msgs.length) {
      const aiMsgDiv = msgs[msgs.length - 1];
      aiMsgDiv.innerHTML = `Sorry, there was an error generating your routine. Please try again later. 😔`;
    }
    chatWindow.scrollTop = chatWindow.scrollHeight;
    // Re-enable buttons and input on error
    generateRoutineButton.disabled = false;
    sendBtn.disabled = false;
  }
});
