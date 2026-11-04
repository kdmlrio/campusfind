
/* =========================================================
   CAMPUSFIND - PATEROS TECHNOLOGICAL COLLEGE
   Supabase Connected Version
   Database: Supabase
   Photo Storage: Supabase Storage
========================================================= */

(async function () {
    "use strict";

    // =====================================================
    // 1. SUPABASE CONNECTION
    // =====================================================

    const SUPABASE_URL = "https://earnzkvqjmaksbfagrfe.supabase.co";
    const SUPABASE_KEY = "sb_publishable_26Vo87zi-Lr0bBYNE8HE9w_v4cUPFhA";
    const PHOTO_BUCKET = "campusfind-photos";

    const { createClient } = await import(
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
    );

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // =====================================================
    // 2. ELEMENTS
    // =====================================================

    const $ = (id) => document.getElementById(id);

    const publicPage = $("publicPage");
    const adminLoginPage = $("adminLoginPage");
    const adminDashboard = $("adminDashboard");

    const reportForm = $("reportForm");
    const claimForm = $("claimForm");
    const claimStatusForm = $("claimStatusForm");
    const loginForm = $("adminLoginForm");

    let reports = [];
    let claims = [];
    let selectedReport = null;
    let selectedPhoto = null;
    let currentAdmin = null;

    // =====================================================
    // 3. HELPERS
    // =====================================================

    function escapeHTML(value = "") {
        return String(value).replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function formatDate(value) {
        if (!value) return "Not available";

        return new Date(value).toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });
    }

    function generateReference() {
        const year = new Date().getFullYear();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `CF-${year}-${random}`;
    }

    function showMessage(element, message, type = "success") {
        if (!element) return;

        element.textContent = message;
        element.className = `message ${type}`;
        element.classList.remove("hidden");
    }

    function hide(element) {
        if (element) element.classList.add("hidden");
    }

    function show(element) {
        if (element) element.classList.remove("hidden");
    }

    function reportStatus(report) {
        return report.status || "Available";
    }

    function isClosedReport(report) {
        return ["returned", "closed", "released"].includes(
            reportStatus(report).toLowerCase()
        );
    }

    function statusClass(status) {
        return String(status || "Pending")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");
    }

    function setButtonLoading(button, loading, originalText = "Submit") {
        if (!button) return;

        button.disabled = loading;
        button.textContent = loading ? "Please wait..." : originalText;
    }

    function notify(message) {
        alert(message);
    }

    // =====================================================
    // 4. DATABASE - LOAD REPORTS
    // =====================================================

    async function loadReports() {
        const { data, error } = await supabase
            .from("reports")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Reports error:", error);
            notify("Unable to load reports. Please refresh the page.");
            return;
        }

        reports = data || [];
        renderReports();
        renderAdminReports();
        updateDashboardCounts();
    }

    // =====================================================
    // 5. DATABASE - LOAD CLAIMS (ADMIN ONLY)
    // =====================================================

    async function loadClaims() {
        if (!currentAdmin) return;

        const { data, error } = await supabase
            .from("claims")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Claims error:", error);
            notify("Unable to load claims. Check your admin permissions.");
            return;
        }

        claims = data || [];
        renderAdminClaims();
        updateDashboardCounts();
    }

    // =====================================================
    // 6. PUBLIC REPORT DISPLAY
    // =====================================================

    function renderReports() {
        const container = $("itemList");
        const emptyMessage = $("emptyMessage");

        if (!container) return;

        const search = ($("searchInput")?.value || "").toLowerCase();
        const filter = ($("filterType")?.value || "all").toLowerCase();

        const filtered = reports.filter(report => {
            const text = [
                report.item_name,
                report.item_type,
                report.item_location,
                report.item_description
            ].join(" ").toLowerCase();

            const matchesSearch = text.includes(search);
            const matchesType =
                filter === "all" ||
                String(report.item_type).toLowerCase() === filter;

            return matchesSearch && matchesType;
        });

        container.innerHTML = "";

        if (!filtered.length) {
            show(emptyMessage);
            return;
        }

        hide(emptyMessage);

        filtered.forEach(report => {
            const status = reportStatus(report);
            const card = document.createElement("article");

            card.className = "item-card";

            card.innerHTML = `
                ${report.item_photo ? `
                    <img
                        class="item-image"
                        src="${escapeHTML(report.item_photo)}"
                        alt="${escapeHTML(report.item_name)}"
                    >
                ` : ""}

                <div class="item-card-content">
                    <span class="status-badge ${statusClass(status)}">
                        ${escapeHTML(status)}
                    </span>

                    <h3>${escapeHTML(report.item_name)}</h3>

                    <p><strong>Type:</strong>
                        ${escapeHTML(report.item_type)}</p>

                    <p><strong>Location:</strong>
                        ${escapeHTML(report.item_location)}</p>

                    <p>${escapeHTML(report.item_description || "")}</p>

                    <small>Reported: ${formatDate(report.created_at)}</small>

                    ${!isClosedReport(report) ? `
                        <button
                            type="button"
                            class="claim-item-btn"
                            data-report-id="${report.id}">
                            Claim This Item
                        </button>
                    ` : ""}
                </div>
            `;

            container.appendChild(card);
        });
    }

    $("searchInput")?.addEventListener("input", renderReports);
    $("filterType")?.addEventListener("change", renderReports);

    $("itemList")?.addEventListener("click", event => {
        const button = event.target.closest(".claim-item-btn");
        if (!button) return;

        openClaimModal(button.dataset.reportId);
    });

    // =====================================================
    // 7. PHOTO PREVIEW
    // =====================================================

    $("itemPhoto")?.addEventListener("change", event => {
        const file = event.target.files?.[0];

        selectedPhoto = null;

        if (!file) {
            hide($("photoPreviewContainer"));
            return;
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(file.type)) {
            notify("Only JPG, PNG, and WebP images are allowed.");
            event.target.value = "";
            hide($("photoPreviewContainer"));
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            notify("Image must not exceed 5 MB.");
            event.target.value = "";
            hide($("photoPreviewContainer"));
            return;
        }

        selectedPhoto = file;

        const preview = $("photoPreview");
        if (preview) {
            preview.src = URL.createObjectURL(file);
            show($("photoPreviewContainer"));
        }
    });

    $("removePhoto")?.addEventListener("click", () => {
        selectedPhoto = null;

        if ($("itemPhoto")) $("itemPhoto").value = "";
        if ($("photoPreview")) $("photoPreview").src = "";

        hide($("photoPreviewContainer"));
    });

    // =====================================================
    // 8. UPLOAD PHOTO TO SUPABASE STORAGE
    // =====================================================

    async function uploadPhoto(file) {
        if (!file) return null;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(file.type)) {
            throw new Error("Only JPG, PNG, and WebP images are allowed.");
        }

        if (file.size > 5 * 1024 * 1024) {
            throw new Error("Image must not exceed 5 MB.");
        }

        const extension = file.type === "image/png"
            ? "png"
            : file.type === "image/webp"
                ? "webp"
                : "jpg";

        const filePath = `${crypto.randomUUID()}.${extension}`;

        const { error } = await supabase.storage
            .from(PHOTO_BUCKET)
            .upload(filePath, file, {
                contentType: file.type,
                upsert: false
            });

        if (error) throw error;

        const { data } = supabase.storage
            .from(PHOTO_BUCKET)
            .getPublicUrl(filePath);

        return data.publicUrl;
    }

    // =====================================================
    // 9. SUBMIT LOST / FOUND REPORT
    // =====================================================

    reportForm?.addEventListener("submit", async event => {
        event.preventDefault();

        const button = reportForm.querySelector('[type="submit"]');
        setButtonLoading(button, true, "Submit Report");

        try {
            const photoURL = await uploadPhoto(selectedPhoto);

            const reportData = {
                item_name: $("itemName")?.value.trim(),
                item_type: $("itemType")?.value,
                item_location: $("itemLocation")?.value.trim(),
                item_description: $("itemDescription")?.value.trim(),
                item_photo: photoURL,
                status: "Available"
            };

            if (
                !reportData.item_name ||
                !reportData.item_type ||
                !reportData.item_location
            ) {
                throw new Error("Please complete all required fields.");
            }

            const { error } = await supabase
                .from("reports")
                .insert(reportData);

            if (error) throw error;

            reportForm.reset();
            selectedPhoto = null;
            hide($("photoPreviewContainer"));

            showMessage(
                $("formMessage"),
                "Report submitted successfully!",
                "success"
            );

            await loadReports();

        } catch (error) {
            console.error(error);
            showMessage(
                $("formMessage"),
                error.message || "Unable to submit report.",
                "error"
            );
        } finally {
            setButtonLoading(button, false, "Submit Report");
        }
    });

    // =====================================================
    // 10. CLAIM MODAL
    // =====================================================

    function openClaimModal(reportId) {
        selectedReport = reports.find(report => report.id === reportId);

        if (!selectedReport) return;

        if ($("claimItemId")) $("claimItemId").value = reportId;

        if ($("claimItemTitle")) {
            $("claimItemTitle").textContent = selectedReport.item_name;
        }

        show($("claimModal"));
    }

    function closeClaimModal() {
        hide($("claimModal"));
        selectedReport = null;
        claimForm?.reset();
        hide($("claimMessage"));
    }

    $("closeClaim")?.addEventListener("click", closeClaimModal);

    $("claimModal")?.addEventListener("click", event => {
        if (event.target === $("claimModal")) {
            closeClaimModal();
        }
    });

    // =====================================================
    // 11. SUBMIT CLAIM
    // =====================================================

    claimForm?.addEventListener("submit", async event => {
        event.preventDefault();

        const button = claimForm.querySelector('[type="submit"]');
        setButtonLoading(button, true, "Submit Claim");

        try {
            const reportId = $("claimItemId")?.value;
            const report = reports.find(item => item.id === reportId);

            if (!report || isClosedReport(report)) {
                throw new Error("This item is no longer available for claiming.");
            }

            const reference = generateReference();

            const claimData = {
                report_id: reportId,
                claim_reference: reference,
                claimant_name: $("claimName")?.value.trim(),
                student_id: $("claimStudentId")?.value.trim(),
                contact: $("claimContact")?.value.trim(),
                proof: $("claimProof")?.value.trim() || "",
                status: "Pending"
            };

            if (
                !claimData.claimant_name ||
                !claimData.student_id ||
                !claimData.contact
            ) {
                throw new Error("Please complete all required fields.");
            }

            const { error } = await supabase
                .from("claims")
                .insert(claimData);

            if (error) throw error;

            showMessage(
                $("claimMessage"),
                `Claim submitted! Your reference number is ${reference}. Save this number to check your claim status.`,
                "success"
            );

            claimForm.reset();

            await loadReports();

        } catch (error) {
            console.error(error);
            showMessage(
                $("claimMessage"),
                error.message || "Unable to submit claim.",
                "error"
            );
        } finally {
            setButtonLoading(button, false, "Submit Claim");
        }
    });

    // =====================================================
    // 12. PUBLIC CLAIM STATUS CHECKER
    // =====================================================

    claimStatusForm?.addEventListener("submit", async event => {
        event.preventDefault();

        const reference = $("claimReferenceInput")?.value.trim().toUpperCase();

        if (!reference) return;

        const result = $("claimStatusResult");
        if (!result) return;

        result.textContent = "Checking claim status...";

        const { data, error } = await supabase.rpc(
            "check_claim_status",
            { ref: reference }
        );

        if (error) {
            console.error(error);
            result.textContent = "Unable to check status. Please try again.";
            return;
        }

        if (!data || !data.length) {
            result.textContent = "No claim found. Please check your reference number.";
            return;
        }

        const claim = data[0];

        result.innerHTML = `
            <div class="claim-status-card">
                <h3>Claim Status</h3>
                <p><strong>Reference:</strong>
                    ${escapeHTML(claim.claim_reference)}</p>
                <p><strong>Item:</strong>
                    ${escapeHTML(claim.item_name)}</p>
                <p><strong>Status:</strong>
                    <span class="status-badge ${statusClass(claim.status)}">
                        ${escapeHTML(claim.status)}
                    </span>
                </p>
                <p><strong>Submitted:</strong>
                    ${formatDate(claim.created_at)}</p>
                ${claim.approved_at ? `<p><strong>Approved:</strong> ${formatDate(claim.approved_at)}</p>` : ""}
                ${claim.rejected_at ? `<p><strong>Rejected:</strong> ${formatDate(claim.rejected_at)}</p>` : ""}
                ${claim.released_at ? `<p><strong>Released:</strong> ${formatDate(claim.released_at)}</p>` : ""}
                ${claim.closed_at ? `<p><strong>Closed:</strong> ${formatDate(claim.closed_at)}</p>` : ""}
            </div>
        `;
    });

    // =====================================================
    // 13. PAGE NAVIGATION
    // =====================================================

    function showPublicPage() {
        show(publicPage);
        hide(adminLoginPage);
        hide(adminDashboard);
    }

    function showLoginPage() {
        hide(publicPage);
        show(adminLoginPage);
        hide(adminDashboard);
    }

    function showDashboard() {
        hide(publicPage);
        hide(adminLoginPage);
        show(adminDashboard);
    }

    $("openAdmin")?.addEventListener("click", showLoginPage);
    $("backHome")?.addEventListener("click", showPublicPage);

    // =====================================================
    // 14. ADMIN LOGIN - SUPABASE AUTH
    // =====================================================

    loginForm?.addEventListener("submit", async event => {
        event.preventDefault();

        const button = loginForm.querySelector('[type="submit"]');
        setButtonLoading(button, true, "Login");

        try {
            const email = $("adminUsername")?.value.trim();
            const password = $("adminPassword")?.value;

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            const user = data.user;

            const { data: role, error: roleError } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .maybeSingle();

            if (roleError || !role || role.role !== "admin") {
                await supabase.auth.signOut();
                throw new Error("Access denied. Admin account only.");
            }

            currentAdmin = user;

            loginForm.reset();
            showDashboard();

            await loadReports();
            await loadClaims();

        } catch (error) {
            console.error(error);
            showMessage(
                $("loginMessage"),
                error.message || "Invalid email or password.",
                "error"
            );
        } finally {
            setButtonLoading(button, false, "Login");
        }
    });

    // =====================================================
    // 15. ADMIN DASHBOARD COUNTS
    // =====================================================

    function updateDashboardCounts() {
        const total = reports.length;
        const totalClaims = claims.length;
        const pendingClaims = claims.filter(
            claim => claim.status.toLowerCase() === "pending"
        ).length;

        if ($("totalReports")) $("totalReports").textContent = total;
        if ($("totalClaims")) $("totalClaims").textContent = totalClaims;
        if ($("pendingClaims")) $("pendingClaims").textContent = pendingClaims;
    }

    // =====================================================
    // 16. ADMIN REPORT MANAGEMENT
    // =====================================================

    function renderAdminReports() {
        const container = $("adminReports");
        if (!container) return;

        container.innerHTML = "";

        if (!reports.length) {
            container.innerHTML = "<p>No reports available.</p>";
            return;
        }

        reports.forEach(report => {
            const card = document.createElement("div");
            card.className = "admin-item-card";

            const status = reportStatus(report);

            card.innerHTML = `
                ${report.item_photo ? `
                    <img class="admin-item-image"
                        src="${escapeHTML(report.item_photo)}"
                        alt="${escapeHTML(report.item_name)}">
                ` : ""}

                <h3>${escapeHTML(report.item_name)}</h3>
                <p><strong>Type:</strong> ${escapeHTML(report.item_type)}</p>
                <p><strong>Location:</strong> ${escapeHTML(report.item_location)}</p>
                <p><strong>Status:</strong> ${escapeHTML(status)}</p>
                <p><strong>Reported:</strong> ${formatDate(report.created_at)}</p>

                ${!isClosedReport(report) ? `
                    <button type="button"
                        data-action="returned"
                        data-id="${report.id}">
                        Mark as Returned
                    </button>
                ` : ""}

                <button type="button"
                    data-action="delete-report"
                    data-id="${report.id}">
                    Delete Report
                </button>
            `;

            container.appendChild(card);
        });
    }

    $("adminReports")?.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const id = button.dataset.id;
        const action = button.dataset.action;

        if (action === "returned") {
            if (!confirm("Mark this item as returned?")) return;

            const { error } = await supabase
                .from("reports")
                .update({
                    status: "Returned",
                    returned_at: new Date().toISOString()
                })
                .eq("id", id);

            if (error) {
                notify(error.message);
                return;
            }

            await loadReports();
            notify("Item marked as returned.");
        }

        if (action === "delete-report") {
            if (!confirm("Delete this report permanently?")) return;

            const report = reports.find(item => item.id === id);

            // Remove photo from storage if it belongs to this bucket.
            if (report?.item_photo) {
                try {
                    const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
                    const index = report.item_photo.indexOf(marker);

                    if (index !== -1) {
                        const path = decodeURIComponent(
                            report.item_photo.substring(index + marker.length)
                        );

                        const { error: photoError } = await supabase.storage
                            .from(PHOTO_BUCKET)
                            .remove([path]);

                        if (photoError) {
                            console.warn("Photo delete warning:", photoError);
                        }
                    }
                } catch (photoError) {
                    console.warn(photoError);
                }
            }

            const { error } = await supabase
                .from("reports")
                .delete()
                .eq("id", id);

            if (error) {
                notify(error.message);
                return;
            }

            await loadReports();
            await loadClaims();
            notify("Report deleted successfully.");
        }
    });

    // =====================================================
    // 17. ADMIN CLAIM MANAGEMENT
    // =====================================================

    function renderAdminClaims() {
        const container = $("adminClaims");
        if (!container) return;

        container.innerHTML = "";

        if (!claims.length) {
            container.innerHTML = "<p>No claim requests yet.</p>";
            return;
        }

        claims.forEach(claim => {
            const report = reports.find(item => item.id === claim.report_id);

            const card = document.createElement("div");
            card.className = "admin-claim-card";

            card.innerHTML = `
                <h3>${escapeHTML(report?.item_name || "Deleted item")}</h3>

                <p><strong>Reference:</strong>
                    ${escapeHTML(claim.claim_reference)}</p>

                <p><strong>Claimant:</strong>
                    ${escapeHTML(claim.claimant_name)}</p>

                <p><strong>Student ID:</strong>
                    ${escapeHTML(claim.student_id)}</p>

                <p><strong>Contact:</strong>
                    ${escapeHTML(claim.contact)}</p>

                <p><strong>Proof:</strong>
                    ${escapeHTML(claim.proof || "Not provided")}</p>

                <p><strong>Status:</strong>
                    <span class="status-badge ${statusClass(claim.status)}">
                        ${escapeHTML(claim.status)}
                    </span>
                </p>

                <p><strong>Submitted:</strong>
                    ${formatDate(claim.created_at)}</p>

                ${claim.status.toLowerCase() === "pending" ? `
                    <button type="button"
                        data-action="approve"
                        data-id="${claim.id}">
                        Approve Claim
                    </button>

                    <button type="button"
                        data-action="reject"
                        data-id="${claim.id}">
                        Reject Claim
                    </button>
                ` : ""}

                ${claim.status.toLowerCase() === "approved" ? `
                    <button type="button"
                        data-action="release"
                        data-id="${claim.id}">
                        Confirm Item Released
                    </button>
                ` : ""}
            `;

            container.appendChild(card);
        });
    }

    $("adminClaims")?.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const id = button.dataset.id;
        const action = button.dataset.action;

        const claim = claims.find(item => item.id === id);
        if (!claim) return;

        let updates = {};

        if (action === "approve") {
            if (!confirm("Approve this claim request?")) return;

            updates = {
                status: "Approved",
                approved_at: new Date().toISOString()
            };
        }

        if (action === "reject") {
            if (!confirm("Reject this claim request?")) return;

            updates = {
                status: "Rejected",
                rejected_at: new Date().toISOString()
            };
        }

        if (action === "release") {
            if (!confirm("Confirm that the item has been released to the claimant?")) return;

            updates = {
                status: "Released",
                released_at: new Date().toISOString(),
                closed_at: new Date().toISOString()
            };
        }

        const { error } = await supabase
            .from("claims")
            .update(updates)
            .eq("id", id);

        if (error) {
            notify(error.message);
            return;
        }

        if (action === "release") {
            const { error: reportError } = await supabase
                .from("reports")
                .update({
                    status: "Returned",
                    returned_at: new Date().toISOString(),
                    released_at: new Date().toISOString()
                })
                .eq("id", claim.report_id);

            if (reportError) {
                notify("Claim released, but report status could not be updated: " + reportError.message);
            }
        }

        await loadClaims();
        await loadReports();

        notify("Claim updated successfully.");
    });

    // =====================================================
    // 18. ADMIN LOGOUT
    // =====================================================

    $("logoutAdmin")?.addEventListener("click", async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            notify(error.message);
            return;
        }

        currentAdmin = null;
        claims = [];
        showPublicPage();
        await loadReports();
    });

    // =====================================================
    // 19. RESTORE ADMIN SESSION
    // =====================================================

    async function restoreAdminSession() {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (!session) return;

        const { data: role } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (role?.role === "admin") {
            currentAdmin = session.user;
            showDashboard();
            await loadClaims();
        }
    }

    // =====================================================
    // 20. INITIALIZE WEBSITE
    // =====================================================

    try {
        await loadReports();
        await restoreAdminSession();
        console.log("CampusFind connected to Supabase successfully.");
    } catch (error) {
        console.error("CampusFind initialization error:", error);
    }

})();
