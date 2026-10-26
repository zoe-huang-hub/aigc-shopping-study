function bringProductPopupToFront(panel) {
  document.querySelectorAll(".product-card").forEach(card => card.classList.remove("active-popup"));
  const card = panel.closest(".product-card");
  if (card) card.classList.add("active-popup");
}

function closeAboutPanels(except = null) {
  document.querySelectorAll(".about-item").forEach(panel => {
    if (panel !== except) {
      panel.classList.remove("open");
      const product = panel.id.replace("details-", "");
      const btn = document.querySelector('.details-btn[data-product="' + product + '"]');
      if (btn) btn.textContent = "View Details";
    }
  });
}

function closeReviewPanels(except = null) {
  document.querySelectorAll(".review-popup").forEach(panel => {
    if (panel !== except) {
      panel.classList.remove("open");
      const product = panel.id.replace("reviews-", "");
      const btn = document.querySelector('.rating-btn[data-product="' + product + '"]');
      if (btn) btn.setAttribute("aria-expanded", "false");
    }
  });
}

document.querySelectorAll(".details-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const panel = document.getElementById("details-" + btn.dataset.product);
    const willOpen = !panel.classList.contains("open");

    if (willOpen) {
      // A later click always wins: close reviews and other detail panels,
      // then bring this product card/panel to the foreground.
      closeReviewPanels();
      closeAboutPanels(panel);
      panel.classList.add("open");
      bringProductPopupToFront(panel);
      btn.textContent = "Hide Details";
    } else {
      panel.classList.remove("open");
      btn.textContent = "View Details";
      const card = panel.closest(".product-card");
      if (card) card.classList.remove("active-popup");
    }
  });
});

document.querySelectorAll(".rating-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const panel = document.getElementById("reviews-" + btn.dataset.product);
    const willOpen = !panel.classList.contains("open");

    if (willOpen) {
      // A later click always wins: close details and other review panels,
      // then bring this product card/panel to the foreground.
      closeAboutPanels();
      closeReviewPanels(panel);
      panel.classList.add("open");
      bringProductPopupToFront(panel);
      btn.setAttribute("aria-expanded", "true");
    } else {
      panel.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      const card = panel.closest(".product-card");
      if (card) card.classList.remove("active-popup");
    }
  });
});

document.querySelectorAll(".close-reviews").forEach(btn => {
  btn.addEventListener("click", e => {
    e.stopPropagation();
    const panel = document.getElementById("reviews-" + btn.dataset.product);
    panel.classList.remove("open");
    const rating = document.querySelector('.rating-btn[data-product="' + btn.dataset.product + '"]');
    if (rating) rating.setAttribute("aria-expanded", "false");
    const card = panel.closest(".product-card");
    if (card) card.classList.remove("active-popup");
  });
});

let selectedChoice = null;
document.querySelectorAll(".choice").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".choice").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedChoice = btn.dataset.choice;
    document.getElementById("choiceMessage").textContent = "You selected " + btn.textContent.trim() + ".";
    document.getElementById("continueBtn").disabled = false;
  });
});

document.getElementById("continueBtn").addEventListener("click", () => {
  const chosen = document.querySelector('.choice[data-choice="' + selectedChoice + '"]');
  alert("Prototype complete. Selected product: " + (chosen ? chosen.textContent.trim() : selectedChoice));
});

const specBtn = document.getElementById("specBtn");
const specPanel = document.getElementById("specPanel");
specBtn.addEventListener("click", () => {
  const open = specPanel.classList.toggle("open");
  specBtn.textContent = open ? "Hide Technical Specifications" : "Compare Technical Specifications";
  specBtn.setAttribute("aria-expanded", open ? "true" : "false");
});

function positionMobileDrawer(panel){
  if(window.innerWidth>700) {
    panel.style.removeProperty("top");
    return;
  }
  const grid=document.querySelector(".product-grid");
  const card=panel.closest(".product-card");
  if(!grid || !card) return;
  const gridRect=grid.getBoundingClientRect();
  const cardRect=card.getBoundingClientRect();
  panel.style.top=(cardRect.bottom-gridRect.top+8)+"px";
}

document.querySelectorAll(".details-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const panel=document.getElementById("details-"+btn.dataset.product);
    if(panel && panel.classList.contains("open")) positionMobileDrawer(panel);
  });
});
document.querySelectorAll(".rating-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const panel=document.getElementById("reviews-"+btn.dataset.product);
    if(panel && panel.classList.contains("open")) positionMobileDrawer(panel);
  });
});
window.addEventListener("resize",()=>{
  document.querySelectorAll(".about-item.open,.review-popup.open").forEach(positionMobileDrawer);
});
