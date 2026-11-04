
/* =====================================================
   CAMPUSFIND - PATEROS TECHNOLOGICAL COLLEGE
   Complete JavaScript - Local Demo Version
   Compatible with existing index.html and style.css
===================================================== */

(() => {
    "use strict";

    // =====================================================
    // 1. STORAGE
    // =====================================================

    const REPORTS_KEY = "campusFindReports";
    const CLAIMS_KEY = "campusFindClaims";
    const ACTIVITY_KEY = "campusFindActivities";

    let reports = loadData(REPORTS_KEY);
    let claims = loadData(CLAIMS_KEY);
    let activities = loadData(ACTIVITY_KEY);
    let selectedPhoto = "";

    function loadData(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return Array.isArray(value) ? value : [];
        } catch (error) {
            console.error("Storage loading error:", error);
            return [];
        }
    }

    function generateId() {
        return "CFID-" + Date.now().toString(36) +
            "-" + Math.random().toString(36).slice(2, 10);
    }

    function currentTimestamp() {
        return new Date().toISOString();
    }

    function formatDateTime(timestamp) {
        if (!timestamp) return "Not recorded";

        const date = new Date(timestamp);

        if (Number.isNaN(date.getTime())) return "Not recorded";

        return new Intl.DateTimeFormat("en-PH", {
            timeZone: "Asia/Manila",
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        }).format(date);
    }

    function generateReference() {
        const year = new Intl.DateTimeFormat("en", {
            timeZone: "Asia/Manila",
            year: "numeric"
        }).format(new Date());

        let reference;

        do {
            reference = "CF-" + year + "-" +
                Math.random().toString(36).slice(2, 8).toUpperCase();
        } while (claims.some(c =>
            String(c.reference || "").toUpperCase() === reference
        ));

        return reference;
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function normalizeId(value) {
        return String(value ?? "").trim();
    }

    function findReport(id) {
        const target = normalizeId(id);
        return reports.find(report =>
            normalizeId(report.id) === target
        );
    }

    function findClaim(id) {
        const target = normalizeId(id);
        return claims.find(claim =>
            normalizeId(claim.id) === target
        );
    }

    function getReportStatus(report) {
        return report?.status || "Available";
    }

    function isClosedReport(report) {
        return ["Returned", "Released", "Deleted"].includes(
            String(getReportStatus(report)).toLowerCase()
        );
    }

    function isReportAvailable(report) {
        return report &&
            String(report.type || "").toLowerCase() === "found" &&
            String(getReportStatus(report)).toLowerCase() === "available";
    }

    function showMessage(element, message, type = "success") {
        if (!element) return;
        element.textContent = message;
        element.className = "form-message " + type;
        element.style.display = "block";
    }

    function addActivity(action, details) {
        activities.unshift({
            id: generateId(),
            action,
            details,
            date: currentTimestamp()
        });

        activities = activities.slice(0, 500);
    }

    // =====================================================
    // 2. OLD DATA MIGRATION
    // =====================================================

    function migrateOldRecords() {
        const oldIdMap = new Map();
        const usedIds = new Set();
        let changed = false;

        reports = reports.map(report => {
            const originalId = report.id;
            let id = normalizeId(originalId);

            if (!id || usedIds.has(id)) {
                id = generateId();
                changed = true;
            }

            if (originalId !== undefined && originalId !== null) {
                const oldId = normalizeId(originalId);
                if (!oldIdMap.has(oldId)) {
                    oldIdMap.set(oldId, id);
                }
            }

            if (normalizeId(originalId) !== id) changed = true;

            usedIds.add(id);

            return {
                ...report,
                id,
                name: report.name || report.itemName || "Unnamed Item",
                type: report.type || report.itemType || "Lost",
                location: report.location || report.itemLocation || "Not specified",
                description: report.description || "",
                photo: report.photo || "",
                date: report.date || report.createdAt || currentTimestamp(),
                status: report.status || "Available"
            };
        });

        claims = claims.map(claim => {
            let itemId = normalizeId(
                claim.itemId ?? claim.reportId ?? claim.itemID ?? ""
            );

            if (oldIdMap.has(itemId)) {
                itemId = oldIdMap.get(itemId);
            }

            const id = normalizeId(claim.id) || generateId();

            if (!claim.id || claim.itemId !== itemId) changed = true;

            return {
                ...claim,
                id,
                itemId,
                itemName: claim.itemName || "Unknown Item",
                reference: claim.reference || "",
                status: claim.status || "Pending"
            };
        });

        if (changed) {
            console.log("CampusFind: old records migrated.");
            saveData();
        }
    }

    function saveData() {
        const previous = {
            reports: localStorage.getItem(REPORTS_KEY),
            claims: localStorage.getItem(CLAIMS_KEY),
            activities: localStorage.getItem(ACTIVITY_KEY)
        };

        try {
            localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
            localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
            localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));
            return true;
        } catch (error) {
            console.error("Save error:", error);

            try {
                restoreStorage(REPORTS_KEY, previous.reports);
                restoreStorage(CLAIMS_KEY, previous.claims);
                restoreStorage(ACTIVITY_KEY, previous.activities);
            } catch (restoreError) {
                console.error("Restore error:", restoreError);
            }

            alert("Unable to save changes. Browser storage may be full.");
            return false;
        }
    }

    function restoreStorage(key, value) {
        if (value === null) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, value);
        }
    }

    function commitChanges(callback) {
        const oldReports = JSON.stringify(reports);
        const oldClaims = JSON.stringify(claims);
        const oldActivities = JSON.stringify(activities);

        try {
            callback();

            if (!saveData()) {
                reports = JSON.parse(oldReports);
                claims = JSON.parse(oldClaims);
                activities = JSON.parse(oldActivities);
                return false;
            }

            return true;
        } catch (error) {
            console.error("Action error:", error);
            reports = JSON.parse(oldReports);
            claims = JSON.parse(oldClaims);
            activities = JSON.parse(oldActivities);
            alert("The action could not be completed. Please try again.");
            return false;
        }
    }

    migrateOldRecords();

    // =====================================================
    // 3. PAGE NAVIGATION
    // =====================================================

    const publicPage = document.getElementById("publicPage");
    const adminLoginPage = document.getElementById("adminLoginPage");
    const adminDashboard = document.getElementById("adminDashboard");

    function showPublicPage() {
        publicPage?.classList.remove("hidden");
        adminLoginPage?.classList.add("hidden");
        adminDashboard?.classList.add("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function showAdminLogin() {
        publicPage?.classList.add("hidden");
        adminLoginPage?.classList.remove("hidden");
        adminDashboard?.classList.add("hidden");

        const message = document.getElementById("loginMessage");
        if (message) message.textContent = "";

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function showDashboard() {
        publicPage?.classList.add("hidden");
        adminLoginPage?.classList.add("hidden");
        adminDashboard?.classList.remove("hidden");

        renderDashboard();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    window.showPublicPage = showPublicPage;
    window.showAdminLogin = showAdminLogin;
    window.showDashboard = showDashboard;

    document.getElementById("openAdmin")
        ?.addEventListener("click", showAdminLogin);

    document.getElementById("backHome")
        ?.addEventListener("click", showPublicPage);

    document.getElementById("logoutAdmin")
        ?.addEventListener("click", showPublicPage);

    // =====================================================
    // 4. PHOTO UPLOAD
    // =====================================================

    const photoInput = document.getElementById("itemPhoto");
    const photoPreview = document.getElementById("photoPreview");
    const photoPreviewContainer =
        document.getElementById("photoPreviewContainer");

    const removePhotoButton =
        document.getElementById("removePhoto");

    function compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = event => {
                const image = new Image();

                image.onload = () => {
                    const canvas = document.createElement("canvas");
                    const max = 900;

                    let width = image.width;
                    let height = image.height;

                    if (width > height && width > max) {
                        height = Math.round(height * max / width);
                        width = max;
                    } else if (height > max) {
                        width = Math.round(width * max / height);
                        height = max;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const context = canvas.getContext("2d");

                    if (!context) {
                        reject(new Error("Canvas unavailable"));
                        return;
                    }

                    context.drawImage(image, 0, 0, width, height);
                    resolve(canvas.toDataURL("image/jpeg", 0.72));
                };

                image.onerror = reject;
                image.src = event.target.result;
            };

            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    photoInput?.addEventListener("change", async () => {
        const file = photoInput.files?.[0];
        if (!file) return;

        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            alert("Please upload JPG, PNG, or WebP only.");
            photoInput.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("Image must not exceed 5MB.");
            photoInput.value = "";
            return;
        }

        try {
            selectedPhoto = await compressImage(file);

            if (photoPreview) photoPreview.src = selectedPhoto;
            photoPreviewContainer?.classList.remove("hidden");
        } catch (error) {
            console.error(error);
            alert("Unable to upload image.");
            selectedPhoto = "";
            photoInput.value = "";
        }
    });

    removePhotoButton?.addEventListener("click", () => {
        selectedPhoto = "";
        if (photoInput) photoInput.value = "";
        if (photoPreview) photoPreview.src = "";
        photoPreviewContainer?.classList.add("hidden");
    });

    // =====================================================
    // 5. PUBLIC ITEM LIST
    // =====================================================

    function renderItems() {
        const itemList = document.getElementById("itemList");
        const emptyMessage = document.getElementById("emptyMessage");
        if (!itemList) return;

        const search = (
            document.getElementById("searchInput")?.value || ""
        ).toLowerCase().trim();

        const selectedType = (
            document.getElementById("filterType")?.value || "All"
        ).toLowerCase();

        const visibleReports = reports.filter(report => {
            if (isClosedReport(report)) return false;

            const searchable = [
                report.name,
                report.location,
                report.description,
                report.type
            ].join(" ").toLowerCase();

            return searchable.includes(search) &&
                (selectedType === "all" ||
                 String(report.type).toLowerCase() === selectedType);
        });

        itemList.innerHTML = "";

        if (!visibleReports.length) {
            emptyMessage?.classList.remove("hidden");
            return;
        }

        emptyMessage?.classList.add("hidden");

        visibleReports.forEach(report => {
            const card = document.createElement("article");
            card.className = "item-card";

            const image = report.photo
                ? `<img src="${escapeHTML(report.photo)}" alt="Photo of ${escapeHTML(report.name)}">`
                : `<div class="item-placeholder">📦</div>`;

            const typeClass =
                String(report.type).toLowerCase() === "lost" ? "lost" : "";

            const claimButton = isReportAvailable(report)
                ? `<button type="button" class="btn btn-primary btn-block"
                    data-claim-item="${escapeHTML(report.id)}">
                    Claim This Item
                   </button>`
                : "";

            card.innerHTML = `
                ${image}
                <div class="item-content">
                    <span class="type-badge ${typeClass}">
                        ${escapeHTML(report.type)}
                    </span>
                    <h3>${escapeHTML(report.name)}</h3>
                    <p><strong>Location:</strong> ${escapeHTML(report.location)}</p>
                    <p>${escapeHTML(report.description)}</p>
                    <p><strong>Reported:</strong> ${formatDateTime(report.date)}</p>
                    ${claimButton}
                </div>
            `;

            itemList.appendChild(card);
        });
    }

    document.getElementById("searchInput")
        ?.addEventListener("input", renderItems);

    document.getElementById("filterType")
        ?.addEventListener("change", renderItems);

    // =====================================================
    // 6. REPORT SUBMISSION
    // =====================================================

    const reportForm = document.getElementById("reportForm");

    reportForm?.addEventListener("submit", event => {
        event.preventDefault();

        const name = document.getElementById("itemName").value.trim();
        const type = document.getElementById("itemType").value;
        const location = document.getElementById("itemLocation").value.trim();
        const description = document.getElementById("itemDescription").value.trim();
        const message = document.getElementById("formMessage");

        if (!name || !type || !location || !description) {
            showMessage(message, "Please complete all required fields.", "error");
            return;
        }

        const report = {
            id: generateId(),
            name,
            type,
            location,
            description,
            photo: selectedPhoto,
            date: currentTimestamp(),
            status: "Available"
        };

        const saved = commitChanges(() => {
            reports.unshift(report);
            addActivity("New Item Reported", `${name} (${type}) was reported.`);
        });

        if (!saved) return;

        reportForm.reset();
        selectedPhoto = "";

        if (photoPreview) photoPreview.src = "";
        photoPreviewContainer?.classList.add("hidden");

        showMessage(message, "Your item report has been submitted successfully!");
        renderItems();
        renderDashboard();
    });

    // =====================================================
    // 7. CLAIM MODAL
    // =====================================================

    const claimModal = document.getElementById("claimModal");
    const claimForm = document.getElementById("claimForm");

    function openClaimModal(itemId) {
        const report = findReport(itemId);

        if (!isReportAvailable(report)) {
            alert("This item is no longer available for claiming.");
            renderItems();
            return;
        }

        const idInput = document.getElementById("claimItemId");
        const title = document.getElementById("claimItemTitle");
        const message = document.getElementById("claimMessage");

        if (idInput) idInput.value = report.id;
        if (title) title.textContent = "Item: " + report.name;
        if (message) message.textContent = "";

        claimModal?.classList.remove("hidden");
    }

    function closeClaimModal() {
        claimModal?.classList.add("hidden");
    }

    document.getElementById("closeClaim")
        ?.addEventListener("click", closeClaimModal);

    claimModal?.addEventListener("click", event => {
        if (event.target === claimModal) closeClaimModal();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeClaimModal();
    });

    document.getElementById("itemList")
        ?.addEventListener("click", event => {
            const button = event.target.closest("[data-claim-item]");
            if (button) openClaimModal(button.dataset.claimItem);
        });

    // =====================================================
    // 8. CLAIM SUBMISSION
    // =====================================================

    claimForm?.addEventListener("submit", event => {
        event.preventDefault();

        const itemId = normalizeId(
            document.getElementById("claimItemId").value
        );

        const name = document.getElementById("claimName").value.trim();
        const studentId = document.getElementById("claimStudentId").value.trim();
        const contact = document.getElementById("claimContact").value.trim();
        const proof = document.getElementById("claimProof").value.trim();
        const message = document.getElementById("claimMessage");

        const report = findReport(itemId);

        if (!isReportAvailable(report)) {
            showMessage(message, "This item is no longer available.", "error");
            return;
        }

        if (!name || !studentId || !contact || !proof) {
            showMessage(message, "Please complete all claim information.", "error");
            return;
        }

        const existingClaim = claims.find(claim =>
            normalizeId(claim.itemId) === normalizeId(report.id) &&
            ["Pending", "Approved"].includes(claim.status)
        );

        if (existingClaim) {
            showMessage(message, "This item already has an active claim request.", "error");
            return;
        }

        const reference = generateReference();

        const claim = {
            id: generateId(),
            reference,
            itemId: report.id,
            itemName: report.name,
            name,
            studentId,
            contact,
            proof,
            date: currentTimestamp(),
            status: "Pending"
        };

        const saved = commitChanges(() => {
            claims.unshift(claim);
            addActivity("Claim Submitted", `${name} submitted a claim for ${report.name}.`);
        });

        if (!saved) return;

        claimForm.reset();
        closeClaimModal();
        renderDashboard();

        alert(
            "Your claim request has been submitted!\n\n" +
            "Claim Reference Number:\n" + reference +
            "\n\nSave this number to check your claim status."
        );
    });

    // =====================================================
    // 9. CLAIM STATUS CHECKER
    // =====================================================

    document.getElementById("claimStatusForm")
        ?.addEventListener("submit", event => {
            event.preventDefault();

            const reference = document.getElementById("claimReferenceInput")
                .value.trim().toUpperCase();

            const result = document.getElementById("claimStatusResult");
            if (!reference || !result) return;

            const claim = claims.find(item =>
                String(item.reference || "").toUpperCase() === reference
            );

            if (!claim) {
                result.className = "status-result rejected";
                result.innerHTML = `
                    <h3>Claim Reference Not Found</h3>
                    <p>Please check your reference number and try again.</p>
                `;
                return;
            }

            const instructions = {
                Pending: "Your claim request is waiting for administrator verification.",
                Approved: "Your claim has been approved. Please proceed to the Registrar's Office for verification and release.",
                Rejected: "Your claim request was rejected. Please contact the Registrar's Office.",
                Released: "The item has been released and handed over.",
                Closed: "This claim has been closed. Please contact the Registrar's Office."
            };

            result.className = "status-result " +
                String(claim.status || "Pending").toLowerCase();

            result.innerHTML = `
                <h3>Claim Status: ${escapeHTML(claim.status)}</h3>
                <p><strong>Reference:</strong> ${escapeHTML(claim.reference)}</p>
                <p><strong>Item:</strong> ${escapeHTML(claim.itemName)}</p>
                <p><strong>Date Submitted:</strong> ${formatDateTime(claim.date)}</p>
                ${claim.approvedDate ? `<p><strong>Approved:</strong> ${formatDateTime(claim.approvedDate)}</p>` : ""}
                ${claim.rejectedDate ? `<p><strong>Rejected:</strong> ${formatDateTime(claim.rejectedDate)}</p>` : ""}
                ${claim.releasedDate ? `<p><strong>Released:</strong> ${formatDateTime(claim.releasedDate)}</p>` : ""}
                ${claim.closedDate ? `<p><strong>Closed:</strong> ${formatDateTime(claim.closedDate)}</p>` : ""}
                <p>${escapeHTML(instructions[claim.status] || "Please contact the Registrar's Office.")}</p>
            `;
        });

    // =====================================================
    // 10. ADMIN LOGIN
    // =====================================================

    document.getElementById("adminLoginForm")
        ?.addEventListener("submit", event => {
            event.preventDefault();

            const username = document.getElementById("adminUsername").value.trim();
            const password = document.getElementById("adminPassword").value;
            const message = document.getElementById("loginMessage");

            if (username === "admin" && password === "CampusFindDemo123!") {
                event.target.reset();
                showDashboard();
            } else {
                showMessage(message, "Incorrect username or password.", "error");
            }
        });

    // =====================================================
    // 11. ADMIN REPORTS
    // =====================================================

    function renderAdminReports() {
        const container = document.getElementById("adminReports");
        if (!container) return;

        if (!reports.length) {
            container.innerHTML = "<p>No item reports available.</p>";
            return;
        }

        container.innerHTML = reports.map(report => {
            const image = report.photo
                ? `<img src="${escapeHTML(report.photo)}" alt="Item photo">`
                : "";

            return `
                <div class="admin-card" data-report-id="${escapeHTML(report.id)}">
                    ${image}
                    <div class="admin-card-content">
                        <h3>${escapeHTML(report.name)}</h3>
                        <p><strong>Type:</strong> ${escapeHTML(report.type)}</p>
                        <p><strong>Location:</strong> ${escapeHTML(report.location)}</p>
                        <p><strong>Description:</strong> ${escapeHTML(report.description)}</p>
                        <p><strong>Reported:</strong> ${formatDateTime(report.date)}</p>
                        <p><strong>Status:</strong> ${escapeHTML(getReportStatus(report))}</p>
                        ${report.returnedDate ? `<p><strong>Returned:</strong> ${formatDateTime(report.returnedDate)}</p>` : ""}
                        ${report.releasedDate ? `<p><strong>Released:</strong> ${formatDateTime(report.releasedDate)}</p>` : ""}

                        <div class="admin-actions">
                            ${!isClosedReport(report) ? `
                                <button type="button"
                                    data-action="return-report"
                                    data-id="${escapeHTML(report.id)}">
                                    Mark as Returned
                                </button>
                            ` : ""}

                            <button type="button" class="danger"
                                data-action="delete-report"
                                data-id="${escapeHTML(report.id)}">
                                Delete Report
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    // =====================================================
    // 12. ADMIN CLAIMS
    // =====================================================

    function renderAdminClaims() {
        const container = document.getElementById("adminClaims");
        if (!container) return;

        if (!claims.length) {
            container.innerHTML = "<p>No claim requests available.</p>";
            return;
        }

        container.innerHTML = claims.map(claim => `
            <div class="admin-card" data-claim-id="${escapeHTML(claim.id)}">
                <div class="admin-card-content">
                    <h3>${escapeHTML(claim.itemName)}</h3>
                    <p><strong>Reference:</strong> ${escapeHTML(claim.reference || "No reference")}</p>
                    <p><strong>Claimant:</strong> ${escapeHTML(claim.name)}</p>
                    <p><strong>Student ID:</strong> ${escapeHTML(claim.studentId)}</p>
                    <p><strong>Contact:</strong> ${escapeHTML(claim.contact)}</p>
                    <p><strong>Proof:</strong> ${escapeHTML(claim.proof)}</p>
                    <p><strong>Submitted:</strong> ${formatDateTime(claim.date)}</p>
                    ${claim.approvedDate ? `<p><strong>Approved:</strong> ${formatDateTime(claim.approvedDate)}</p>` : ""}
                    ${claim.rejectedDate ? `<p><strong>Rejected:</strong> ${formatDateTime(claim.rejectedDate)}</p>` : ""}
                    ${claim.releasedDate ? `<p><strong>Released:</strong> ${formatDateTime(claim.releasedDate)}</p>` : ""}
                    <p><strong>Status:</strong> ${escapeHTML(claim.status)}</p>

                    <div class="admin-actions">
                        ${claim.status === "Pending" ? `
                            <button type="button" data-action="approve-claim"
                                data-id="${escapeHTML(claim.id)}">Approve</button>
                            <button type="button" class="danger"
                                data-action="reject-claim"
                                data-id="${escapeHTML(claim.id)}">Reject</button>
                        ` : ""}

                        ${claim.status === "Approved" ? `
                            <button type="button" data-action="release-claim"
                                data-id="${escapeHTML(claim.id)}">
                                Confirm Item Released
                            </button>
                        ` : ""}
                    </div>
                </div>
            </div>
        `).join("");
    }

    // =====================================================
    // 13. ACTIVITY LOG
    // =====================================================

    function renderActivityLog() {
        const container = document.getElementById("adminActivityLog");
        if (!container) return;

        if (!activities.length) {
            container.innerHTML = "<p>No activity recorded yet.</p>";
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="admin-card activity-card">
                <h3>${escapeHTML(activity.action)}</h3>
                <p>${escapeHTML(activity.details)}</p>
                <small>${formatDateTime(activity.date)}</small>
            </div>
        `).join("");
    }

    // =====================================================
    // 14. DASHBOARD
    // =====================================================

    function renderDashboard() {
        const totalReports = document.getElementById("totalReports");
        const totalClaims = document.getElementById("totalClaims");
        const pendingClaims = document.getElementById("pendingClaims");

        if (totalReports) totalReports.textContent = reports.length;
        if (totalClaims) totalClaims.textContent = claims.length;

        if (pendingClaims) {
            pendingClaims.textContent = claims.filter(
                claim => claim.status === "Pending"
            ).length;
        }

        renderAdminReports();
        renderAdminClaims();
        renderActivityLog();
    }

    // =====================================================
    // 15. ADMIN REPORT ACTIONS
    // =====================================================

    document.getElementById("adminReports")
        ?.addEventListener("click", event => {

            const button = event.target.closest("button[data-action]");
            if (!button) return;

            const action = button.dataset.action;
            const reportId = normalizeId(button.dataset.id);
            const report = findReport(reportId);

            if (!report) {
                alert("Report not found. Please refresh the dashboard.");
                renderDashboard();
                return;
            }

            if (action === "return-report") {
                if (isClosedReport(report)) {
                    alert("This report is already closed.");
                    return;
                }

                if (!confirm(`Mark "${report.name}" as Returned?`)) return;

                const saved = commitChanges(() => {
                    report.status = "Returned";
                    report.returnedDate = currentTimestamp();

                    claims.forEach(claim => {
                        if (
                            normalizeId(claim.itemId) === normalizeId(report.id) &&
                            ["Pending", "Approved"].includes(claim.status)
                        ) {
                            claim.status = "Closed";
                            claim.closedDate = currentTimestamp();
                        }
                    });

                    addActivity("Item Marked as Returned",
                        `${report.name} was marked as Returned.`);
                });

                if (!saved) return;

                renderItems();
                renderDashboard();
                alert("Successfully marked as Returned!");
            }

            else if (action === "delete-report") {
                if (!confirm(
                    `PERMANENTLY DELETE "${report.name}"?\n\n` +
                    "Connected claims will also be deleted.\n\n" +
                    "This action cannot be undone."
                )) return;

                const deletedName = report.name;
                const deletedId = normalizeId(report.id);

                const saved = commitChanges(() => {
                    reports = reports.filter(item =>
                        normalizeId(item.id) !== deletedId
                    );

                    claims = claims.filter(claim =>
                        normalizeId(claim.itemId) !== deletedId
                    );

                    addActivity("Report Deleted",
                        `${deletedName} and its connected claims were deleted.`);
                });

                if (!saved) return;

                renderItems();
                renderDashboard();

                alert("Report and connected claims successfully deleted.");
            }
        });

    // =====================================================
    // 16. ADMIN CLAIM ACTIONS
    // =====================================================

    document.getElementById("adminClaims")
        ?.addEventListener("click", event => {

            const button = event.target.closest("button[data-action]");
            if (!button) return;

            const action = button.dataset.action;
            const claimId = normalizeId(button.dataset.id);
            const claim = findClaim(claimId);

            if (!claim) {
                alert("Claim not found. Please refresh the dashboard.");
                renderDashboard();
                return;
            }

            const report = findReport(claim.itemId);

            if (action === "approve-claim") {
                if (claim.status !== "Pending") {
                    alert("This claim is no longer pending.");
                    return;
                }

                if (!isReportAvailable(report)) {
                    alert("This item is no longer available.");
                    return;
                }

                const anotherApproved = claims.find(item =>
                    normalizeId(item.itemId) === normalizeId(claim.itemId) &&
                    normalizeId(item.id) !== normalizeId(claim.id) &&
                    item.status === "Approved"
                );

                if (anotherApproved) {
                    alert("Another claim has already been approved.");
                    return;
                }

                if (!confirm(`Approve the claim of ${claim.name}?`)) return;

                const saved = commitChanges(() => {
                    claim.status = "Approved";
                    claim.approvedDate = currentTimestamp();

                    addActivity("Claim Approved",
                        `Claim ${claim.reference} for ${claim.itemName} was approved.`);
                });

                if (!saved) return;

                renderDashboard();
                alert("Claim successfully approved!");
            }

            else if (action === "reject-claim") {
                if (claim.status !== "Pending") {
                    alert("Only pending claims can be rejected.");
                    return;
                }

                if (!confirm(`Reject the claim of ${claim.name}?`)) return;

                const saved = commitChanges(() => {
                    claim.status = "Rejected";
                    claim.rejectedDate = currentTimestamp();

                    addActivity("Claim Rejected",
                        `Claim ${claim.reference} for ${claim.itemName} was rejected.`);
                });

                if (!saved) return;

                renderDashboard();
                alert("Claim request successfully rejected.");
            }

            else if (action === "release-claim") {
                if (!report) {
                    alert("The related item report could not be found.");
                    return;
                }

                if (claim.status !== "Approved") {
                    alert("Only approved claims can be released.");
                    return;
                }

                if (!confirm(
                    `Confirm that "${claim.itemName}" has been handed over to ${claim.name}?`
                )) return;

                const saved = commitChanges(() => {
                    const releasedTime = currentTimestamp();

                    claim.status = "Released";
                    claim.releasedDate = releasedTime;

                    report.status = "Released";
                    report.releasedDate = releasedTime;

                    claims.forEach(otherClaim => {
                        if (
                            normalizeId(otherClaim.itemId) === normalizeId(claim.itemId) &&
                            normalizeId(otherClaim.id) !== normalizeId(claim.id) &&
                            ["Pending", "Approved"].includes(otherClaim.status)
                        ) {
                            otherClaim.status = "Closed";
                            otherClaim.closedDate = releasedTime;
                        }
                    });

                    addActivity("Item Released",
                        `${claim.itemName} was released to ${claim.name}.`);
                });

                if (!saved) return;

                renderItems();
                renderDashboard();
                alert("Item successfully marked as Released!");
            }
        });

    // =====================================================
    // 17. INITIALIZE
    // =====================================================

    renderItems();
    renderDashboard();
    showPublicPage();

    console.log("CampusFind loaded successfully.");

})();
