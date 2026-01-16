
      // Initialize AOS
      AOS.init({
        duration: 800,
        once: true,
      });

      // DOM Elements
      const loginContainer = document.getElementById("login-container");
      const mainNavbar = document.getElementById("main-navbar");
      const mainContainer = document.getElementById("main-container");
      const mainFooter = document.getElementById("main-footer");

      const fishTableBody = document.getElementById("fish-table-body");
      const addFishForm = document.getElementById("add-fish-form");
      const updateFishBtn = document.getElementById("update-fish-btn");
      const refreshStockBtn = document.getElementById("refresh-stock");
      const logsContainer = document.getElementById("logs-container");

      // Login/Logout elements
      const googleLoginBtn = document.getElementById("google-login-btn");
      const logoutBtn = document.getElementById("logout-btn");
      const userProfile = document.getElementById("user-profile");
      const userAvatar = document.getElementById("user-avatar");
      const userName = document.getElementById("user-name");
      const userEmail = document.getElementById("user-email");
      const welcomeMessage = document.getElementById("welcome-message");

      // Stats elements
      const totalFishElement = document.getElementById("total-fish");
      const speciesCountElement = document.getElementById("species-count");
      const avgSizeElement = document.getElementById("avg-size");
      const totalMovementsElement = document.getElementById("total-movements");
      const lastUpdatedElement = document.getElementById("last-updated");

      // PDF Elements
      const pdfContainer = document.getElementById("pdf-container");
      const pdfTableBody = document.getElementById("pdf-table-body");
      const pdfDateElement = document.getElementById("pdf-date");
      const pdfTimeElement = document.getElementById("pdf-time");
      const pdfTotalElement = document.getElementById("pdf-total");
      const pdfUserElement = document.getElementById("pdf-user");

      // Current fish data
      let fishData = [];
      let currentUser = null;
      let db = null;
      let auth = null;
      let isInitializing = false;
      let showAllLogs = false;
      let allLogsData = [];
      let allFishData = [];
      let filteredFishData = [];
      let currentPage = 1;
      let rowsPerPage = 10;
      let sortField = "name"; // เปลี่ยนจาก "createdAt" เป็น "name"
      let sortDirection = "desc"; // เรียงจาก ก-ฮ
      let totalPages = 1;

      // Firebase Configuration
      const FIREBASE_CONFIG = {
        apiKey: "AIzaSyC0bQCzHTlz1DHHQ4mz7vf0-ZQZXHtAQME",
        authDomain: "fish-farm-stock-systems.firebaseapp.com",
        databaseURL:
          "https://fish-farm-stock-systems-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "fish-farm-stock-systems",
        storageBucket: "fish-farm-stock-systems.firebasestorage.app",
        messagingSenderId: "818200107184",
        appId: "1:818200107184:web:da57af0d8061f28ef70375",
      };

      // Initialize the application
      document.addEventListener("DOMContentLoaded", function () {
        // Set current date
        const now = new Date();
        const options = { year: "numeric", month: "long", day: "numeric" };
        lastUpdatedElement.textContent = now.toLocaleDateString(
          "th-TH",
          options
        );

        // Initialize Firebase
        initializeFirebase();

        // Set current year in footer
        document.getElementById("year").textContent = new Date().getFullYear();

        // Add event listeners
        const toggleLogsBtn = document.getElementById("toggle-logs-btn");
        if (toggleLogsBtn) {
          toggleLogsBtn.addEventListener("click", toggleLogsView);
        }

        // ปุ่ม Export
        const exportJpegBtn = document.getElementById("export-jpeg-btn");
        const exportPdfBtn = document.getElementById("export-pdf-btn");
        const exportCsvBtn = document.getElementById("export-csv-btn");

        if (exportJpegBtn) {
          exportJpegBtn.addEventListener("click", exportToJPEG);
        }
        if (exportPdfBtn) {
          exportPdfBtn.addEventListener("click", exportToPDF);
        }
        if (exportCsvBtn) {
          exportCsvBtn.addEventListener("click", exportToCSV);
        }

        const fishSearch = document.getElementById("fish-search");
        const rowsPerPageSelect = document.getElementById("rows-per-page");
        const sortIdBtn = document.getElementById("sort-id");
        const sortNameBtn = document.getElementById("sort-name");
        const sortSizeBtn = document.getElementById("sort-size");
        const sortQuantityBtn = document.getElementById("sort-quantity");
        const sortStatusBtn = document.getElementById("sort-status");

        if (fishSearch) {
          fishSearch.addEventListener(
            "input",
            debounce(function () {
              searchFish(this.value);
            }, 300)
          );
        }

        if (rowsPerPageSelect) {
          rowsPerPageSelect.addEventListener("change", function () {
            rowsPerPage = parseInt(this.value);
            currentPage = 1;
            renderFishTable();
          });
        }

        // Event Listeners สำหรับการเรียงลำดับ
        if (sortIdBtn)
          sortIdBtn.addEventListener("click", () => sortTable("index"));
        if (sortNameBtn)
          sortNameBtn.addEventListener("click", () => sortTable("name"));
        if (sortSizeBtn)
          sortSizeBtn.addEventListener("click", () => sortTable("size"));
        if (sortQuantityBtn)
          sortQuantityBtn.addEventListener("click", () =>
            sortTable("quantity")
          );
        if (sortStatusBtn)
          sortStatusBtn.addEventListener("click", () => sortTable("status"));

        // เพิ่ม Event Listeners สำหรับ pagination
        document.addEventListener("click", function (e) {
          if (
            e.target.classList.contains("page-link") &&
            !e.target.parentElement.classList.contains("disabled")
          ) {
            e.preventDefault();
            const page = e.target.getAttribute("data-page");
            if (page) {
              goToPage(parseInt(page));
            } else if (e.target.closest("#prev-page")) {
              goToPage(currentPage - 1);
            } else if (e.target.closest("#next-page")) {
              goToPage(currentPage + 1);
            }
          }
        });
      });

      // ฟังก์ชันเตรียมข้อมูลสำหรับ PDF
      function preparePDFData(itemsToExport) {
        // เตรียมวันที่และเวลา
        const now = new Date();
        const dateString = now.toLocaleDateString("th-TH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const timeString = now.toLocaleTimeString("th-TH");

        // อัพเดทข้อมูลใน PDF container
        pdfDateElement.textContent = dateString;
        pdfTimeElement.textContent = timeString;
        pdfTotalElement.textContent = itemsToExport.length.toLocaleString();
        pdfUserElement.textContent = currentUser
          ? currentUser.displayName || "ผู้ใช้"
          : "ไม่ระบุชื่อ";

        // สร้างตาราง PDF ด้วยฟอนต์ใหญ่
        let pdfHTML = "";

        itemsToExport.forEach((fish, index) => {
          const quantity = Number(fish.quantity) || 0;
          const size = Number(fish.size) || 0;

          let statusText = "";
          switch (fish.status) {
            case "active":
              statusText = "พร้อมใช้งาน";
              break;
            case "inactive":
              statusText = "ไม่พร้อมใช้งาน";
              break;
            case "breeding":
              statusText = "กำลังเพาะพันธุ์";
              break;
            default:
              statusText = "พร้อมใช้งาน";
          }

          // ใช้ inline style เพื่อกำหนดฟอนต์ใหญ่
          pdfHTML += `
            <tr>
                <td style="text-align: center; font-size: 15px; font-weight: bold;">${
                  index + 1
                }</td>
                <td style="font-size: 15px;"><strong>${
                  fish.name || "ไม่ทราบชื่อ"
                }</strong></td>
                <td style="text-align: center; font-size: 15px;"><strong>${size}</strong> ${
            fish.unit || "นิ้ว"
          }</td>
                <td style="text-align: center; font-size: 15px; font-weight: bold;">${quantity.toLocaleString()} ตัว</td>
                <td style="text-align: center; font-size: 15px;"><strong>${statusText}</strong></td>
                <td style="font-size: 14px;">${fish.description || "-"}</td>
            </tr>
        `;
        });

        pdfTableBody.innerHTML = pdfHTML;

        // ปรับขนาดฟอนต์ตามจำนวนรายการ - ใช้ฟอนต์ใหญ่กว่าเดิม
        const pdfTable = document.getElementById("pdf-table-content");
        // ถ้าข้อมูลไม่เยอะมาก ให้ใช้ฟอนต์ใหญ่
        if (itemsToExport.length <= 30) {
          pdfTable.classList.add("large-font");
          pdfTable.classList.remove("small-font");

          // ปรับเพิ่มเติมสำหรับข้อมูลน้อย
          pdfTable.style.fontSize = "16px";
          pdfTable.querySelectorAll("th").forEach((th) => {
            th.style.fontSize = "18px";
            th.style.padding = "14px 12px";
            th.style.fontWeight = "bold";
          });
          pdfTable.querySelectorAll("td").forEach((td) => {
            td.style.fontSize = "16px";
            td.style.padding = "12px 10px";
          });
        }
        // ถ้าข้อมูลเยอะปานกลาง
        else if (itemsToExport.length <= 50) {
          pdfTable.classList.remove("large-font", "small-font");
          pdfTable.style.fontSize = "14px";
          pdfTable.querySelectorAll("th").forEach((th) => {
            th.style.fontSize = "16px";
            th.style.padding = "12px 10px";
          });
          pdfTable.querySelectorAll("td").forEach((td) => {
            td.style.fontSize = "14px";
            td.style.padding = "10px 8px";
          });
        }
        // ถ้าข้อมูลเยอะมาก
        else {
          pdfTable.classList.add("small-font");
          pdfTable.classList.remove("large-font");
          // แต่ยังให้ใหญ่กว่าค่าเดิม
          pdfTable.style.fontSize = "13px";
          pdfTable.querySelectorAll("th, td").forEach((cell) => {
            cell.style.fontSize = "13px";
          });
        }
      }
      // ฟังก์ชันส่งออกเป็น PDF (แก้ไขแล้ว - ใช้ html2canvas)
      function exportToPDF() {
        if (filteredFishData.length === 0) {
          Swal.fire({
            icon: "warning",
            title: "ไม่มีข้อมูล",
            text: "ไม่มีข้อมูลปลาที่จะส่งออกเป็น PDF",
          });
          return;
        }

        // แสดง dialog สำหรับเลือกตัวเลือก
        Swal.fire({
          title: "ส่งออกเป็น PDF",
          html: `
            <div class="text-start">
                <p>พบข้อมูลทั้งหมด <strong>${filteredFishData.length}</strong> รายการ</p>
                <div class="mb-3">
                    <label class="form-label">ขนาดฟอนต์ตาราง:</label>
                    <select class="form-select" id="pdf-font-size">
                        <option value="normal" selected>ปกติ (ค่าเริ่มต้น)</option>
                        <option value="large" >ใหญ่</option>
                        <option value="xlarge">ใหญ่มาก</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label">จำนวนรายการที่จะส่งออก:</label>
                    <select class="form-select" id="pdf-item-count">
                        <option value="all">ทั้งหมด (${filteredFishData.length} รายการ)</option>
                        <option value="10">10 รายการแรก</option>
                        <option value="20">20 รายการแรก</option>
                        <option value="30">30 รายการแรก</option>
                        <option value="50">50 รายการแรก</option>
                        <option value="100">100 รายการแรก</option>
                        <option value="custom">กำหนดเอง</option>
                    </select>
                </div>
                <div id="pdf-custom-count-div" class="d-none mt-3">
                    <label class="form-label">ระบุจำนวนรายการ:</label>
                    <input type="number" class="form-control" id="pdf-custom-count" 
                           min="1" max="${filteredFishData.length}" 
                           value="100" placeholder="ระบุจำนวนรายการ">
                    <small class="text-muted">จำนวนสูงสุด ${filteredFishData.length} รายการ</small>
                </div>
                <div class="alert alert-info mt-3">
                    <i class="fas fa-info-circle me-2"></i>
                    <small>แนะนำ: ถ้าเลือกจำนวนรายการน้อยลง ตัวหนังสือจะใหญ่ขึ้นและอ่านง่ายขึ้น</small>
                </div>
            </div>
        `,
          showCancelButton: true,
          confirmButtonText: "สร้าง PDF",
          cancelButtonText: "ยกเลิก",
          didOpen: () => {
            const itemCountSelect = document.getElementById("pdf-item-count");
            const customCountDiv = document.getElementById(
              "pdf-custom-count-div"
            );

            itemCountSelect.addEventListener("change", function () {
              if (this.value === "custom") {
                customCountDiv.classList.remove("d-none");
              } else {
                customCountDiv.classList.add("d-none");
              }
            });
          },
        }).then((result) => {
          if (result.isConfirmed) {
            generatePDF();
          }
        });

        async function generatePDF() {
          try {
            // แสดง loading
            const exportPdfBtn = document.getElementById("export-pdf-btn");
            const originalHTML = exportPdfBtn.innerHTML;
            exportPdfBtn.innerHTML =
              '<i class="fas fa-spinner fa-spin me-1"></i> กำลังสร้าง...';
            exportPdfBtn.disabled = true;

            // กำหนดจำนวนรายการที่จะแสดง
            const itemCountSelect = document.getElementById("pdf-item-count");
            const fontSizeSelect = document.getElementById("pdf-font-size");
            const selectedFontSize = fontSizeSelect
              ? fontSizeSelect.value
              : "large";

            let itemsToExport = [];
            let exportCount = 0;

            if (itemCountSelect.value === "all") {
              itemsToExport = [...filteredFishData];
              exportCount = filteredFishData.length;
            } else if (itemCountSelect.value === "custom") {
              const customCountInput =
                document.getElementById("pdf-custom-count");
              const count = parseInt(customCountInput.value) || 100;
              exportCount = Math.min(count, filteredFishData.length);
              itemsToExport = filteredFishData.slice(0, exportCount);
            } else {
              const count = parseInt(itemCountSelect.value);
              exportCount = Math.min(count, filteredFishData.length);
              itemsToExport = filteredFishData.slice(0, exportCount);
            }

            if (exportCount === 0) {
              Swal.fire({
                icon: "warning",
                title: "ไม่มีข้อมูล",
                text: "ไม่มีข้อมูลที่จะส่งออก",
              });

              // รีเซ็ตปุ่ม
              exportPdfBtn.innerHTML = originalHTML;
              exportPdfBtn.disabled = false;
              return;
            }

            // แสดงข้อความกำลังประมวลผล
            Swal.fire({
              title: "กำลังสร้าง PDF",
              html: `กำลังเตรียมข้อมูล ${exportCount} รายการ...`,
              allowOutsideClick: false,
              didOpen: () => {
                Swal.showLoading();
              },
            });

            // เตรียมข้อมูลสำหรับ PDF
            preparePDFData(itemsToExport);

            // ปรับฟอนต์ตามที่เลือก
            const pdfTable = document.getElementById("pdf-table-content");

            if (selectedFontSize === "xlarge") {
              // ใหญ่มาก - เหมาะสำหรับจำนวนน้อย
              pdfContainer.style.fontSize = "28px";
              pdfTable.style.fontSize = "26px";
              pdfTable.querySelectorAll("th").forEach((th) => {
                th.style.fontSize = "26px";
                th.style.padding = "24px 22px";
              });
              pdfTable.querySelectorAll("td").forEach((td) => {
                td.style.fontSize = "26px";
                td.style.padding = "24px 22px";
              });
            } else if (selectedFontSize === "large") {
              // ใหญ่
              pdfContainer.style.fontSize = "26px";
              pdfTable.style.fontSize = "24px";
              pdfTable.querySelectorAll("th").forEach((th) => {
                th.style.fontSize = "24px";
                th.style.padding = "22px 20px";
              });
              pdfTable.querySelectorAll("td").forEach((td) => {
                td.style.fontSize = "24px";
                td.style.padding = "22px 20px";
              });
            } else {
              // ปกติ
              pdfContainer.style.fontSize = "24px";
              pdfTable.style.fontSize = "22px";
              pdfTable.querySelectorAll("th").forEach((th) => {
                th.style.fontSize = "22px";
                th.style.padding = "20px 18px";
              });
              pdfTable.querySelectorAll("td").forEach((td) => {
                td.style.fontSize = "22px";
                td.style.padding = "20px 18px";
              });
            }

            // แสดง container ของ PDF
            pdfContainer.style.display = "block";

            // รอให้ DOM อัพเดท
            await new Promise((resolve) => setTimeout(resolve, 500));

            // ใช้ html2canvas จับภาพ
            const canvas = await html2canvas(pdfContainer, {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: "#ffffff",
              allowTaint: true,
              onclone: function (clonedDoc) {
                // ทำให้แน่ใจว่าฟอนต์ถูกโหลดใน cloned document
                const container = clonedDoc.getElementById("pdf-container");
                if (container) {
                  container.style.fontFamily = "'Sarabun', 'Kanit', sans-serif";
                }
              },
            });

            // ซ่อน container
            pdfContainer.style.display = "none";

            // สร้าง PDF จาก canvas
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF("p", "mm", "a4");

            const imgWidth = 190; // mm
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 10;

            // เพิ่มภาพลงใน PDF
            pdf.addImage(canvas, "PNG", 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // เพิ่มหน้าอื่นถ้าจำเป็น
            while (heightLeft >= 0) {
              position = heightLeft - imgHeight;
              pdf.addPage();
              pdf.addImage(canvas, "PNG", 10, position, imgWidth, imgHeight);
              heightLeft -= pageHeight;
            }

            // บันทึกไฟล์
            const fileName = `รายงานสต็อก_${
              new Date().toISOString().split("T")[0]
            }_${exportCount}_รายการ.pdf`;
            pdf.save(fileName);

            // ปิด loading
            Swal.close();

            // รีเซ็ตปุ่ม
            exportPdfBtn.innerHTML = originalHTML;
            exportPdfBtn.disabled = false;

            Swal.fire({
              icon: "success",
              title: "ส่งออกสำเร็จ!",
              html: `
                    <div class="text-start">
                        <p>ส่งออกข้อมูล <strong>${exportCount}</strong> รายการเป็นไฟล์ PDF แล้ว</p>
                        <p>ชื่อไฟล์: <strong>${fileName}</strong></p>
                        <div class="alert alert-success mt-3">
                            <i class="fas fa-check-circle me-2"></i>
                            <strong>จำนวนหน้า:</strong> ${pdf.internal.getNumberOfPages()} หน้า<br>
                            <strong>จำนวนรายการ:</strong> ${exportCount} รายการ<br>
                            <strong>ขนาดฟอนต์:</strong> ${
                              selectedFontSize === "xlarge"
                                ? "ใหญ่มาก"
                                : selectedFontSize === "large"
                                ? "ใหญ่"
                                : "ปกติ"
                            }
                        </div>
                    </div>
                `,
              timer: 3000,
              showConfirmButton: false,
            });
          } catch (error) {
            console.error("Error generating PDF:", error);

            // ซ่อน container
            pdfContainer.style.display = "none";

            // รีเซ็ตปุ่ม
            const exportPdfBtn = document.getElementById("export-pdf-btn");
            exportPdfBtn.innerHTML = '<i class="fas fa-file-pdf me-1"></i> PDF';
            exportPdfBtn.disabled = false;

            // ปิด loading
            Swal.close();

            Swal.fire({
              icon: "error",
              title: "เกิดข้อผิดพลาด!",
              html: `
                    <div class="text-start">
                        <p>ไม่สามารถสร้างไฟล์ PDF ได้</p>
                        <div class="alert alert-danger mt-3">
                            <strong>ข้อผิดพลาด:</strong> ${error.message}<br>
                            <small>กรุณาลองลดจำนวนรายการที่ต้องการส่งออก</small>
                        </div>
                    </div>
                `,
            });
          }
        }
      }

      // ฟังก์ชันส่งออกเป็น JPEG (แก้ไขแล้ว - เพิ่มตัวเลือกจำนวนรายการ)
      function exportToJPEG() {
        if (filteredFishData.length === 0) {
          Swal.fire({
            icon: "warning",
            title: "ไม่มีข้อมูล",
            text: "ไม่มีข้อมูลปลาที่จะส่งออกเป็นรูปภาพ",
          });
          return;
        }

        Swal.fire({
          title: "ส่งออกเป็น JPEG",
          html: `
            <div class="text-start">
                <p>พบข้อมูลทั้งหมด <strong>${filteredFishData.length}</strong> รายการ</p>
                <div class="mb-3">
                    <label class="form-label">จำนวนรายการที่จะส่งออก:</label>
                    <select class="form-select" id="jpeg-item-count">
                        <option value="all">ทั้งหมด (${filteredFishData.length} รายการ)</option>
                        <option value="10">10 รายการแรก</option>
                        <option value="20">20 รายการแรก</option>
                        <option value="30">30 รายการแรก</option>
                        <option value="50">50 รายการแรก</option>
                        <option value="custom">กำหนดเอง</option>
                    </select>
                </div>
                <div id="jpeg-custom-count-div" class="d-none mt-3">
                    <label class="form-label">ระบุจำนวนรายการ:</label>
                    <input type="number" class="form-control" id="jpeg-custom-count" 
                           min="1" max="${filteredFishData.length}" 
                           value="100" placeholder="ระบุจำนวนรายการ">
                    <small class="text-muted">สูงสุด ${filteredFishData.length} รายการ</small>
                </div>
            </div>
        `,
          showCancelButton: true,
          confirmButtonText: "สร้าง JPEG",
          cancelButtonText: "ยกเลิก",
          didOpen: () => {
            const itemCountSelect = document.getElementById("jpeg-item-count");
            const customCountDiv = document.getElementById(
              "jpeg-custom-count-div"
            );

            itemCountSelect.addEventListener("change", function () {
              if (this.value === "custom") {
                customCountDiv.classList.remove("d-none");
              } else {
                customCountDiv.classList.add("d-none");
              }
            });
          },
        }).then((result) => {
          if (result.isConfirmed) {
            generateJPEG();
          }
        });

        function generateJPEG() {
          // กำหนดจำนวนรายการที่จะแสดง
          const itemCountSelect = document.getElementById("jpeg-item-count");
          let itemsToExport = [];
          let exportCount = 0;

          if (itemCountSelect.value === "all") {
            itemsToExport = [...filteredFishData];
            exportCount = filteredFishData.length;
          } else if (itemCountSelect.value === "custom") {
            const customCountInput =
              document.getElementById("jpeg-custom-count");
            const count = parseInt(customCountInput.value) || 100;
            exportCount = Math.min(count, filteredFishData.length);
            itemsToExport = filteredFishData.slice(0, exportCount);
          } else {
            const count = parseInt(itemCountSelect.value);
            exportCount = Math.min(count, filteredFishData.length);
            itemsToExport = filteredFishData.slice(0, exportCount);
          }

          if (exportCount === 0) {
            Swal.fire({
              icon: "warning",
              title: "ไม่มีข้อมูล",
              text: "ไม่มีข้อมูลที่จะส่งออก",
            });
            return;
          }

          // เตรียมข้อมูลสำหรับ JPEG
          preparePDFData(itemsToExport);

          // แสดง container
          pdfContainer.style.display = "block";

          // แสดง loading
          Swal.fire({
            title: "กำลังสร้าง JPEG",
            html: `กำลังเตรียมภาพจาก ${exportCount} รายการ...`,
            showCancelButton: false,
            showConfirmButton: false,
            didOpen: () => {
              Swal.showLoading();
            },
          });

          // ใช้ html2canvas จับภาพ
          setTimeout(() => {
            html2canvas(pdfContainer, {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: "#ffffff",
            })
              .then((canvas) => {
                // แปลง canvas เป็น JPEG
                const image = canvas.toDataURL("image/jpeg", 0.9);

                // สร้างลิงก์สำหรับดาวน์โหลด
                const link = document.createElement("a");
                link.href = image;
                link.download = `รายงานสต็อก_${
                  new Date().toISOString().split("T")[0]
                }_${exportCount}_รายการ.jpg`;
                link.click();

                // ซ่อน container
                pdfContainer.style.display = "none";

                // ปิด loading
                Swal.close();

                Swal.fire({
                  icon: "success",
                  title: "ส่งออกสำเร็จ!",
                  html: `
                        <div class="text-start">
                            <p>ส่งออกข้อมูล <strong>${exportCount}</strong> รายการเป็นไฟล์ JPEG แล้ว</p>
                            <p>ชื่อไฟล์: <strong>${link.download}</strong></p>
                        </div>
                    `,
                  timer: 3000,
                  showConfirmButton: false,
                });
              })
              .catch((error) => {
                // ซ่อน container
                pdfContainer.style.display = "none";

                // ปิด loading
                Swal.close();

                Swal.fire({
                  icon: "error",
                  title: "ผิดพลาด!",
                  text: "ไม่สามารถสร้าง JPEG ได้: " + error.message,
                });
              });
          }, 500);
        }
      }

      // ฟังก์ชันส่งออกเป็น CSV
      function exportToCSV() {
        if (filteredFishData.length === 0) {
          Swal.fire({
            icon: "warning",
            title: "ไม่มีข้อมูล",
            text: "ไม่มีข้อมูลปลาที่จะส่งออก",
          });
          return;
        }

        const headers = [
          "ลำดับ",
          "ชื่อพันธุ์ปลา",
          "ขนาด",
          "หน่วย",
          "จำนวน",
          "สถานะ",
          "รายละเอียด",
          "สร้างเมื่อ",
        ];

        const csvData = filteredFishData.map((fish, index) => {
          let statusText = "";
          switch (fish.status) {
            case "active":
              statusText = "พร้อมใช้งาน";
              break;
            case "inactive":
              statusText = "ไม่พร้อมใช้งาน";
              break;
            case "breeding":
              statusText = "กำลังเพาะพันธุ์";
              break;
            default:
              statusText = "พร้อมใช้งาน";
          }

          let createdAt = "";
          try {
            if (fish.createdAt && typeof fish.createdAt.toDate === "function") {
              const date = fish.createdAt.toDate();
              createdAt = date.toLocaleDateString("th-TH");
            }
          } catch (e) {
            createdAt = "";
          }

          return [
            index + 1,
            fish.name || "",
            fish.size || 0,
            fish.unit || "นิ้ว",
            fish.quantity || 0,
            statusText,
            fish.description || "",
            createdAt,
          ];
        });

        const csvContent = [
          headers.join(","),
          ...csvData.map((row) =>
            row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
          ),
        ].join("\n");

        const blob = new Blob(["\uFEFF" + csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `รายงานสต็อก_${
          new Date().toISOString().split("T")[0]
        }.csv`;
        link.click();

        Swal.fire({
          icon: "success",
          title: "ส่งออกสำเร็จ!",
          text: `ส่งออกข้อมูล ${filteredFishData.length} รายการเป็นไฟล์ CSV แล้ว`,
          timer: 2000,
          showConfirmButton: false,
        });
      }

      // Initialize Firebase
      function initializeFirebase() {
        try {
          if (isInitializing) return;
          isInitializing = true;

          if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
          }

          db = firebase.firestore();
          auth = firebase.auth();

          // Check if user is already logged in
          auth.onAuthStateChanged((user) => {
            if (user) {
              currentUser = user;
              showMainApp();
            } else {
              showLoginScreen();
            }
          });

          showLoginScreen();
        } catch (error) {
          console.error("Error initializing Firebase:", error);
          Swal.fire({
            icon: "error",
            title: "Firebase Error",
            text: "เกิดข้อผิดพลาดในการเชื่อมต่อ Firebase: " + error.message,
          });
          isInitializing = false;
        }
      }

      // Google Login
      googleLoginBtn.addEventListener("click", function () {
        if (!auth) {
          Swal.fire({
            icon: "error",
            title: "Firebase ไม่ได้ตั้งค่า",
            text: "กรุณารอสักครู่ให้ระบบเตรียมความพร้อม",
          });
          return;
        }

        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope("email");
        provider.addScope("profile");

        auth
          .signInWithPopup(provider)
          .then((result) => {
            handleLoginSuccess(result);
          })
          .catch((error) => {
            handleLoginError(error);
          });
      });

      // Function สำหรับจัดการการล็อกอินสำเร็จ
      function handleLoginSuccess(result) {
        currentUser = result.user;

        Swal.fire({
          icon: "success",
          title: "ล็อกอินสำเร็จ!",
          text: `ยินดีต้อนรับ ${currentUser.displayName || "ผู้ใช้"}`,
          timer: 2000,
          showConfirmButton: false,
        }).then(() => {
          showMainApp();

          // Add log after a short delay
          setTimeout(() => {
            if (currentUser) {
              addLog(
                "ระบบ",
                `ผู้ใช้ ${
                  currentUser.displayName || "ผู้ใช้"
                } ล็อกอินเข้าสู่ระบบ`
              );
            }
          }, 1000);
        });
      }

      // Function สำหรับจัดการ error
      function handleLoginError(error) {
        let errorMessage = "เกิดข้อผิดพลาดในการล็อกอิน";
        let showAlert = true;

        switch (error.code) {
          case "auth/popup-closed-by-user":
            errorMessage = "คุณได้ปิดหน้าต่างล็อกอิน";
            showAlert = false;
            break;
          case "auth/network-request-failed":
            errorMessage =
              "เกิดปัญหาเกี่ยวกับเครือข่าย กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต";
            break;
          case "auth/unauthorized-domain":
            errorMessage = "โดเมนนี้ไม่ได้รับอนุญาต กรุณาใช้ลิงก์ที่ถูกต้อง";
            break;
          default:
            errorMessage = error.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
        }

        if (showAlert) {
          Swal.fire({
            icon: "error",
            title: "ล็อกอินไม่สำเร็จ",
            text: errorMessage,
            footer: error.code ? `Error code: ${error.code}` : "",
          });
        }
      }

      // Logout
      logoutBtn.addEventListener("click", function () {
        Swal.fire({
          title: "ยืนยันการออกจากระบบ?",
          text: "คุณต้องการออกจากระบบหรือไม่?",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "ใช่, ออกจากระบบ",
          cancelButtonText: "ยกเลิก",
          confirmButtonColor: "#d33",
        }).then((result) => {
          if (result.isConfirmed) {
            // Add log for logout
            if (currentUser) {
              addLog(
                "ระบบ",
                `ผู้ใช้ ${currentUser.displayName || "ผู้ใช้"} ออกจากระบบ`
              );
            }

            auth
              .signOut()
              .then(() => {
                Swal.fire({
                  icon: "success",
                  title: "ออกจากระบบแล้ว!",
                  text: "คุณได้ออกจากระบบเรียบร้อยแล้ว",
                  timer: 1500,
                  showConfirmButton: false,
                }).then(() => {
                  showLoginScreen();
                });
              })
              .catch((error) => {
                console.error("Error during logout: ", error);
                Swal.fire({
                  icon: "error",
                  title: "เกิดข้อผิดพลาด!",
                  text: "ไม่สามารถออกจากระบบได้",
                  footer: error.message,
                });
              });
          }
        });
      });

      // Show main application
      function showMainApp() {
        loginContainer.classList.add("d-none");
        mainNavbar.classList.remove("d-none");
        mainContainer.classList.remove("d-none");
        mainFooter.classList.remove("d-none");

        updateUserProfile();

        setTimeout(() => {
          afterFishOperation();
          loadLogs();
        }, 300);

        window.scrollTo(0, 0);
      }

      // Show login screen
      function showLoginScreen() {
        loginContainer.classList.remove("d-none");
        mainNavbar.classList.add("d-none");
        mainContainer.classList.add("d-none");
        mainFooter.classList.add("d-none");
        currentUser = null;
      }

      // Update user profile in navbar
      function updateUserProfile() {
        if (currentUser) {
          userAvatar.src =
            currentUser.photoURL ||
            "https://img.icons8.com/?size=48&id=84898&format=png";
          userName.textContent = currentUser.displayName || "ผู้ใช้";
          userEmail.textContent = currentUser.email || "ไม่ทราบอีเมล";
          welcomeMessage.textContent = `ยินดีต้อนรับ ${
            currentUser.displayName || "ผู้ใช้"
          }`;
        }
      }

      // ฟังก์ชัน debounce สำหรับการค้นหา
      function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      }

      // ฟังก์ชันค้นหาปลา
      function searchFish(searchTerm) {
        if (!searchTerm.trim()) {
          filteredFishData = [...allFishData];
        } else {
          const term = searchTerm.toLowerCase().trim();
          filteredFishData = allFishData.filter(
            (fish) =>
              (fish.name && fish.name.toLowerCase().includes(term)) ||
              (fish.description &&
                fish.description.toLowerCase().includes(term)) ||
              (fish.status && fish.status.toLowerCase().includes(term))
          );
        }

        currentPage = 1;
        renderFishTable();
      }

      // ฟังก์ชันเรียงลำดับตาราง
      function sortTable(field) {
        if (sortField === field) {
          sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
          sortField = field;
          sortDirection = "asc";
        }

        updateSortIcons();

        filteredFishData.sort((a, b) => {
          let aValue, bValue;

          switch (field) {
            case "index":
              aValue = allFishData.indexOf(a);
              bValue = allFishData.indexOf(b);
              break;
            case "name":
              // เรียงตามภาษาไทย ก-ฮ
              aValue = (a.name || "").toLowerCase();
              bValue = (b.name || "").toLowerCase();
              break;
            case "size":
              aValue = parseFloat(a.size) || 0;
              bValue = parseFloat(b.size) || 0;
              break;
            case "quantity":
              aValue = parseInt(a.quantity) || 0;
              bValue = parseInt(b.quantity) || 0;
              break;
            case "status":
              aValue = a.status || "";
              bValue = b.status || "";
              break;
            default:
              aValue = a[field] || "";
              bValue = b[field] || "";
          }

          // สำหรับการเรียงภาษาไทย
          if (field === "name") {
            if (sortDirection === "asc") {
              return aValue.localeCompare(bValue, "th");
            } else {
              return bValue.localeCompare(aValue, "th");
            }
          } else {
            // สำหรับการเรียงประเภทอื่นๆ
            if (sortDirection === "asc") {
              return aValue > bValue ? 1 : -1;
            } else {
              return aValue < bValue ? 1 : -1;
            }
          }
        });

        renderFishTable();
      }

      // อัพเดทไอคอนการเรียงลำดับ
      function updateSortIcons() {
        const icons = {
          index: document.querySelector("#sort-id i"),
          name: document.querySelector("#sort-name i"),
          size: document.querySelector("#sort-size i"),
          quantity: document.querySelector("#sort-quantity i"),
          status: document.querySelector("#sort-status i"),
        };

        Object.values(icons).forEach((icon) => {
          if (icon) {
            icon.className = "fas fa-sort ms-1";
          }
        });

        if (icons[sortField]) {
          icons[sortField].className =
            sortDirection === "asc"
              ? "fas fa-sort-up ms-1"
              : "fas fa-sort-down ms-1";
        }
      }

      function loadFishData() {
        if (!db) {
          console.error("Firestore not initialized");
          return;
        }

        fishTableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">กำลังโหลด...</span>
                </div>
                <p class="mt-2">กำลังโหลดข้อมูลสต็อกปลา...</p>
            </td>
        </tr>
    `;
        updateSortIcons();
        db.collection("fish")
          // ลบ .orderBy("createdAt", "desc") ออก เพราะเราจะเรียงในฝั่งไคลเอ็นต์
          .get()
          .then((querySnapshot) => {
            allFishData = [];
            fishData = [];
            let totalQuantity = 0;
            let speciesSet = new Set();
            let totalSize = 0;
            let count = 0;

            if (querySnapshot.empty) {
              fishTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-5">
                            <i class="fas fa-fish fa-3x mb-3" style="color: #ccc;"></i>
                            <p>ยังไม่มีข้อมูลสต็อกปลา</p>
                            <p class="text-muted">เริ่มต้นโดยการเพิ่มข้อมูลปลาด้วยฟอร์มด้านล่าง</p>
                        </td>
                    </tr>
                `;
              updateStats(0, 0, 0, allLogsData.length || 0);
              return;
            }

            querySnapshot.forEach((doc) => {
              const fish = { id: doc.id, ...doc.data() };
              allFishData.push(fish);
              fishData.push(fish);

              const quantity = Number(fish.quantity) || 0;
              const size = Number(fish.size) || 0;

              totalQuantity += quantity;
              speciesSet.add(fish.name);
              totalSize += size;
              count++;
            });

            filteredFishData = [...allFishData];
            sortTable("name"); // เรียงตามชื่อชนิดพันธุ์โดยค่าเริ่มต้น

            const avgSize = count > 0 ? (totalSize / count).toFixed(1) : 0;
            updateStats(
              totalQuantity,
              speciesSet.size,
              avgSize,
              allLogsData.length || 0
            );

            renderFishTable();
          })
          .catch((error) => {
            console.error("Error loading fish data: ", error);

            let errorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
            if (error.code === "permission-denied") {
              errorMessage = "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล";
            }

            fishTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5 text-danger">
                        <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                        <p>${errorMessage}</p>
                        <p class="text-muted">${error.message}</p>
                    </td>
                </tr>
            `;
          });
      }

      // ฟังก์ชันเรนเดอร์ตารางปลา
      function renderFishTable() {
        if (!filteredFishData || filteredFishData.length === 0) {
          fishTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-5">
                            <i class="fas fa-search fa-3x mb-3" style="color: #ccc;"></i>
                            <p>ไม่พบข้อมูลปลาที่ตรงกับคำค้นหา</p>
                        </td>
                    </tr>
                `;

          document
            .getElementById("pagination-container")
            .classList.add("d-none");
          document.getElementById(
            "total-records-info"
          ).textContent = `พบทั้งหมด 0 รายการ`;
          return;
        }

        totalPages = Math.ceil(filteredFishData.length / rowsPerPage);
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = Math.min(
          startIndex + rowsPerPage,
          filteredFishData.length
        );
        const currentData = filteredFishData.slice(startIndex, endIndex);

        let tableHTML = "";

        currentData.forEach((fish, index) => {
          const globalIndex = startIndex + index + 1;
          const quantity = Number(fish.quantity) || 0;
          const size = Number(fish.size) || 0;

          let statusClass, statusText;
          switch (fish.status) {
            case "active":
              statusClass = "status-active";
              statusText = "พร้อมใช้งาน";
              break;
            case "inactive":
              statusClass = "status-inactive";
              statusText = "ไม่พร้อมใช้งาน";
              break;
            case "breeding":
              statusClass = "text-warning";
              statusText = "กำลังเพาะพันธุ์";
              break;
            default:
              statusClass = "status-active";
              statusText = "พร้อมใช้งาน";
          }
          // ปิด AOS สำหรับตาราง
          tableHTML += `
                
                    <tr>
                        <td>${globalIndex}</td>
                        <td>
                            <strong>${fish.name || "ไม่ทราบชื่อ"}</strong>
                            ${
                              fish.description
                                ? `<br><small class="text-muted">${fish.description.substring(
                                    0,
                                    100
                                  )}...</small>`
                                : ""
                            }
                        </td>
                        <td>
                            <span class="fw-bold">${size}</span>
                            <span class="unit-badge ms-1">${
                              fish.unit || "นิ้ว"
                            }</span>
                        </td>
                        <td>
                            <span class="fw-bold">${quantity.toLocaleString()}</span> ตัว
                        </td>
                        <td>
                            <span class="${statusClass}"><i class="fas fa-circle me-1"></i> ${statusText}</span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-warning me-1 edit-fish-btn" data-id="${
                              fish.id
                            }">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-fish-btn" data-id="${
                              fish.id
                            }">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
        });

        fishTableBody.innerHTML = tableHTML;

        document.getElementById(
          "total-records-info"
        ).textContent = `พบทั้งหมด ${filteredFishData.length.toLocaleString()} รายการ (แสดง ${
          startIndex + 1
        }-${endIndex})`;

        renderPagination();

        document.querySelectorAll(".edit-fish-btn").forEach((btn) => {
          btn.addEventListener("click", function () {
            const fishId = this.getAttribute("data-id");
            editFish(fishId);
          });
        });

        document.querySelectorAll(".delete-fish-btn").forEach((btn) => {
          btn.addEventListener("click", function () {
            const fishId = this.getAttribute("data-id");
            deleteFish(fishId);
          });
        });
      }

      // ฟังก์ชันสร้าง pagination
      function renderPagination() {
        const paginationContainer = document.getElementById(
          "pagination-container"
        );

        if (totalPages <= 1) {
          paginationContainer.classList.add("d-none");
          return;
        }

        paginationContainer.classList.remove("d-none");

        let paginationHTML = "";

        paginationHTML += `
                <li class="page-item ${
                  currentPage === 1 ? "disabled" : ""
                }" id="prev-page">
                    <a class="page-link" href="#" tabindex="-1">
                        <i class="fas fa-chevron-left"></i>
                    </a>
                </li>
            `;

        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        for (let i = startPage; i <= endPage; i++) {
          paginationHTML += `
                    <li class="page-item ${i === currentPage ? "active" : ""}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
        }

        paginationHTML += `
                <li class="page-item ${
                  currentPage === totalPages ? "disabled" : ""
                }" id="next-page">
                    <a class="page-link" href="#">
                        <i class="fas fa-chevron-right"></i>
                    </a>
                </li>
            `;

        document.querySelector(".pagination").innerHTML = paginationHTML;
        document.getElementById(
          "page-info"
        ).textContent = `หน้า ${currentPage} จาก ${totalPages}`;
      }

      // ฟังก์ชันไปยังหน้าที่ต้องการ
      function goToPage(page) {
        if (page < 1 || page > totalPages || page === currentPage) return;

        currentPage = page;
        renderFishTable();
        document
          .getElementById("stock-section")
          .scrollIntoView({ behavior: "smooth" });
      }

      // ฟังก์ชันปรับปรุงหลังเพิ่ม/แก้ไข/ลบปลา
      function afterFishOperation() {
        loadFishData();
        document.getElementById("fish-search").value = "";
        currentPage = 1;
      }

      // Update statistics
      function updateStats(totalFish, speciesCount, avgSize) {
        totalFishElement.textContent = totalFish.toLocaleString();
        speciesCountElement.textContent = speciesCount;
        avgSizeElement.textContent = avgSize;
        totalMovementsElement.textContent = allLogsData.length || 0;
      }

      // ฟังก์ชันสำหรับสลับมุมมองล็อก
      function toggleLogsView() {
        showAllLogs = !showAllLogs;

        const toggleBtn = document.getElementById("toggle-logs-btn");
        if (toggleBtn) {
          if (showAllLogs) {
            toggleBtn.innerHTML =
              '<i class="fas fa-eye-slash me-1"></i> แสดงน้อยลง';
            toggleBtn.classList.remove("btn-primary");
            toggleBtn.classList.add("btn-warning");
          } else {
            toggleBtn.innerHTML = '<i class="fas fa-eye me-1"></i> แสดงเพิ่ม';
            toggleBtn.classList.remove("btn-warning");
            toggleBtn.classList.add("btn-primary");
          }
        }

        renderLogs();
      }

      // Load logs from Firebase
      function loadLogs() {
        if (!db) {
          console.error("Firestore not initialized");
          return;
        }

        logsContainer.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">กำลังโหลด...</span>
                    </div>
                    <p class="mt-2">กำลังโหลดประวัติการใช้งาน...</p>
                </div>
            `;

        const toggleBtn = document.getElementById("toggle-logs-btn");
        if (toggleBtn) {
          if (showAllLogs) {
            toggleBtn.innerHTML =
              '<i class="fas fa-eye-slash me-1"></i> แสดงน้อยลง';
            toggleBtn.classList.remove("btn-primary");
            toggleBtn.classList.add("btn-warning");
          } else {
            toggleBtn.innerHTML = '<i class="fas fa-eye me-1"></i> แสดงเพิ่ม';
            toggleBtn.classList.remove("btn-warning");
            toggleBtn.classList.add("btn-primary");
          }
        }

        db.collection("logs")
          .orderBy("timestamp", "desc")
          .limit(100)
          .get()
          .then((querySnapshot) => {
            allLogsData = [];

            if (querySnapshot.empty) {
              allLogsData = [];
              renderLogs();
              return;
            }

            querySnapshot.forEach((doc) => {
              const log = { id: doc.id, ...doc.data() };
              allLogsData.push(log);
            });

            renderLogs();
          })
          .catch((error) => {
            console.error("Error loading logs: ", error);

            let errorMessage = "เกิดข้อผิดพลาดในการโหลดประวัติ";
            if (error.code === "permission-denied") {
              errorMessage = "ไม่มีสิทธิ์ในการเข้าถึงข้อมูล";
            }

            logsContainer.innerHTML = `
                        <div class="text-center py-5 text-danger">
                            <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                            <p>${errorMessage}</p>
                            <p class="text-muted">${error.message}</p>
                        </div>
                    `;
            totalMovementsElement.textContent = "0";
          });
      }

      // เพิ่มฟังก์ชันสำหรับแสดงล็อก
      function renderLogs() {
        if (!allLogsData || allLogsData.length === 0) {
          logsContainer.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-history fa-3x mb-3" style="color: #ccc;"></i>
                        <p>ยังไม่มีประวัติการใช้งาน</p>
                        <p class="text-muted">การกระทำใดๆ กับสต็อกปลาจะถูกบันทึกที่นี่</p>
                    </div>
                `;
          totalMovementsElement.textContent = "0";
          return;
        }

        const logsToShow = showAllLogs ? allLogsData : allLogsData.slice(0, 5);
        const remainingLogs = allLogsData.length - 5;

        let logsHTML = "";
        let index = 1;

        logsToShow.forEach((log) => {
          let dateString = "ไม่ทราบเวลา";
          let timeString = "";

          try {
            if (log.timestamp && typeof log.timestamp.toDate === "function") {
              const date = log.timestamp.toDate();
              timeString = date.toLocaleTimeString("th-TH");
              dateString = date.toLocaleDateString("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
            } else if (log.timestamp && log.timestamp.seconds) {
              const date = new Date(log.timestamp.seconds * 1000);
              timeString = date.toLocaleTimeString("th-TH");
              dateString = date.toLocaleDateString("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
            }
          } catch (error) {
            console.warn("Error parsing timestamp for log:", log.id, error);
          }

          let actionIcon, actionClass;
          switch (log.action) {
            case "เพิ่ม":
              actionIcon = "fa-plus-circle";
              actionClass = "text-success";
              break;
            case "แก้ไข":
              actionIcon = "fa-edit";
              actionClass = "text-warning";
              break;
            case "ลบ":
              actionIcon = "fa-trash-alt";
              actionClass = "text-danger";
              break;
            default:
              actionIcon = "fa-exchange-alt";
              actionClass = "text-primary";
          }

          logsHTML += `
                    <div class="log-entry" data-aos="fade-up" data-aos-delay="${
                      index * 30
                    }">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <i class="fas ${actionIcon} me-2 ${actionClass}"></i>
                                <span class="log-action">${
                                  log.action || "การดำเนินการ"
                                }</span> 
                                <span>${log.details || "ไม่มีรายละเอียด"}</span>
                            </div>
                            <div class="log-time text-end">
                                ${timeString ? `<div>${timeString}</div>` : ""}
                                <div>${dateString}</div>
                            </div>
                        </div>
                    </div>
                `;

          index++;
        });

        if (!showAllLogs && allLogsData.length > 5) {
          logsHTML += `
                    <div class="text-center mt-3">
                        <div class="alert alert-info py-2" style="font-size: 0.9rem;">
                            <i class="fas fa-info-circle me-1"></i>
                            มีรายการอีก ${remainingLogs} รายการที่ยังไม่แสดง
                        </div>
                    </div>
                `;
        }

        if (showAllLogs) {
          logsHTML += `
                    <div class="text-center mt-3">
                        <div class="alert alert-success py-2" style="font-size: 0.9rem;">
                            <i class="fas fa-check-circle me-1"></i>
                            แสดงประวัติทั้งหมด ${allLogsData.length} รายการ
                        </div>
                    </div>
                `;
        }

        logsContainer.innerHTML = logsHTML;
        totalMovementsElement.textContent = allLogsData.length.toString();
      }

      // Add new fish
      addFishForm.addEventListener("submit", function (e) {
        e.preventDefault();

        if (!currentUser) {
          Swal.fire({
            icon: "error",
            title: "ต้องล็อกอินก่อน!",
            text: "กรุณาล็อกอินก่อนการเพิ่มข้อมูล",
          });
          return;
        }

        if (!db) {
          Swal.fire({
            icon: "error",
            title: "Firestore Error",
            text: "Firestore ยังไม่ได้เริ่มต้น",
          });
          return;
        }

        const fishName = document.getElementById("fish-name").value.trim();
        const fishSize = parseFloat(document.getElementById("fish-size").value);
        const sizeUnit = document.getElementById("size-unit").value;
        const fishQuantity = parseInt(
          document.getElementById("fish-quantity").value
        );
        const fishDescription = document
          .getElementById("fish-description")
          .value.trim();

        if (
          !fishName ||
          isNaN(fishSize) ||
          fishSize <= 0 ||
          isNaN(fishQuantity) ||
          fishQuantity <= 0
        ) {
          Swal.fire({
            icon: "error",
            title: "ข้อมูลไม่ครบถ้วน",
            text: "กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง",
          });
          return;
        }

        const fishData = {
          name: fishName,
          size: fishSize,
          unit: sizeUnit,
          quantity: fishQuantity,
          description: fishDescription || "",
          status: "active",
          createdBy: {
            uid: currentUser.uid,
            name: currentUser.displayName || "ไม่ทราบชื่อ",
            email: currentUser.email || "ไม่ทราบอีเมล",
          },
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        db.collection("fish")
          .add(fishData)
          .then((docRef) => {
            addLog(
              "เพิ่ม",
              `ผู้ใช้ ${
                currentUser.displayName || "ผู้ใช้"
              } เพิ่มพันธุ์ปลา "${fishName}" จำนวน ${fishQuantity} ตัว`
            );

            Swal.fire({
              icon: "success",
              title: "สำเร็จ!",
              text: `เพิ่มพันธุ์ปลา "${fishName}" เรียบร้อยแล้ว`,
              timer: 2000,
              showConfirmButton: false,
            });

            addFishForm.reset();
            afterFishOperation();
          })
          .catch((error) => {
            console.error("Error adding fish: ", error);

            let errorMessage = "ไม่สามารถเพิ่มข้อมูลปลาได้";
            if (error.code === "permission-denied") {
              errorMessage = "ไม่มีสิทธิ์ในการเพิ่มข้อมูล";
            }

            Swal.fire({
              icon: "error",
              title: "เกิดข้อผิดพลาด!",
              text: errorMessage,
              footer: error.message,
            });
          });
      });

      // Edit fish - populate modal
      function editFish(fishId) {
        if (!currentUser) {
          Swal.fire({
            icon: "error",
            title: "ต้องล็อกอินก่อน!",
            text: "กรุณาล็อกอินก่อนการแก้ไขข้อมูล",
          });
          return;
        }

        const fish = fishData.find((f) => f.id === fishId);

        if (!fish) {
          Swal.fire({
            icon: "error",
            title: "ไม่พบข้อมูล",
            text: "ไม่พบข้อมูลปลาที่ต้องการแก้ไข",
          });
          return;
        }

        document.getElementById("edit-fish-id").value = fish.id;
        document.getElementById("edit-fish-name").value = fish.name || "";
        document.getElementById("edit-fish-size").value = fish.size || 0;
        document.getElementById("edit-size-unit").value = fish.unit || "นิ้ว";
        document.getElementById("edit-fish-quantity").value =
          fish.quantity || 0;
        document.getElementById("edit-fish-description").value =
          fish.description || "";
        document.getElementById("edit-fish-status").value =
          fish.status || "active";

        const editModal = new bootstrap.Modal(
          document.getElementById("editFishModal")
        );
        editModal.show();
      }

      // Update fish
      updateFishBtn.addEventListener("click", function () {
        if (!currentUser) {
          Swal.fire({
            icon: "error",
            title: "ต้องล็อกอินก่อน!",
            text: "กรุณาล็อกอินก่อนการอัพเดทข้อมูล",
          });
          return;
        }

        if (!db) {
          Swal.fire({
            icon: "error",
            title: "Firestore Error",
            text: "Firestore ยังไม่ได้เริ่มต้น",
          });
          return;
        }

        const fishId = document.getElementById("edit-fish-id").value;
        const fishName = document.getElementById("edit-fish-name").value.trim();
        const fishSize = parseFloat(
          document.getElementById("edit-fish-size").value
        );
        const sizeUnit = document.getElementById("edit-size-unit").value;
        const fishQuantity = parseInt(
          document.getElementById("edit-fish-quantity").value
        );
        const fishDescription = document
          .getElementById("edit-fish-description")
          .value.trim();
        const fishStatus = document.getElementById("edit-fish-status").value;

        if (
          !fishId ||
          !fishName ||
          isNaN(fishSize) ||
          fishSize <= 0 ||
          isNaN(fishQuantity) ||
          fishQuantity <= 0
        ) {
          Swal.fire({
            icon: "error",
            title: "ข้อมูลไม่ครบถ้วน",
            text: "กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง",
          });
          return;
        }

        const updatedData = {
          name: fishName,
          size: fishSize,
          unit: sizeUnit,
          quantity: fishQuantity,
          description: fishDescription || "",
          status: fishStatus,
          updatedBy: {
            uid: currentUser.uid,
            name: currentUser.displayName || "ไม่ทราบชื่อ",
            email: currentUser.email || "ไม่ทราบอีเมล",
          },
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        db.collection("fish")
          .doc(fishId)
          .update(updatedData)
          .then(() => {
            addLog(
              "แก้ไข",
              `ผู้ใช้ ${
                currentUser.displayName || "ผู้ใช้"
              } แก้ไขพันธุ์ปลา "${fishName}" จำนวน ${fishQuantity} ตัว`
            );

            Swal.fire({
              icon: "success",
              title: "สำเร็จ!",
              text: `อัพเดทพันธุ์ปลา "${fishName}" เรียบร้อยแล้ว`,
              timer: 2000,
              showConfirmButton: false,
            });

            const editModal = bootstrap.Modal.getInstance(
              document.getElementById("editFishModal")
            );
            if (editModal) {
              editModal.hide();
            }

            afterFishOperation();
          })
          .catch((error) => {
            console.error("Error updating fish: ", error);

            let errorMessage = "ไม่สามารถอัพเดทข้อมูลปลาได้";
            if (error.code === "permission-denied") {
              errorMessage = "ไม่มีสิทธิ์ในการอัพเดทข้อมูล";
            } else if (error.code === "not-found") {
              errorMessage = "ไม่พบข้อมูลปลาที่ต้องการอัพเดท";
            }

            Swal.fire({
              icon: "error",
              title: "เกิดข้อผิดพลาด!",
              text: errorMessage,
              footer: error.message,
            });
          });
      });

      // Delete fish
      function deleteFish(fishId) {
        if (!currentUser) {
          Swal.fire({
            icon: "error",
            title: "ต้องล็อกอินก่อน!",
            text: "กรุณาล็อกอินก่อนการลบข้อมูล",
          });
          return;
        }

        if (!db) {
          Swal.fire({
            icon: "error",
            title: "Firestore Error",
            text: "Firestore ยังไม่ได้เริ่มต้น",
          });
          return;
        }

        const fish = fishData.find((f) => f.id === fishId);

        if (!fish) {
          Swal.fire({
            icon: "error",
            title: "ไม่พบข้อมูล",
            text: "ไม่พบข้อมูลปลาที่ต้องการลบ",
          });
          return;
        }

        Swal.fire({
          title: "ยืนยันการลบ?",
          text: `คุณแน่ใจหรือไม่ที่ต้องการลบพันธุ์ปลา "${fish.name}"`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "ใช่, ลบข้อมูล",
          cancelButtonText: "ยกเลิก",
          confirmButtonColor: "#d33",
        }).then((result) => {
          if (result.isConfirmed) {
            db.collection("fish")
              .doc(fishId)
              .delete()
              .then(() => {
                addLog(
                  "ลบ",
                  `ผู้ใช้ ${currentUser.displayName || "ผู้ใช้"} ลบพันธุ์ปลา "${
                    fish.name
                  }" ออกจากระบบ`
                );

                Swal.fire({
                  icon: "success",
                  title: "ลบแล้ว!",
                  text: `พันธุ์ปลา "${fish.name}" ถูกลบออกจากระบบแล้ว`,
                  timer: 2000,
                  showConfirmButton: false,
                });

                afterFishOperation();
              })
              .catch((error) => {
                console.error("Error deleting fish: ", error);

                let errorMessage = "ไม่สามารถลบข้อมูลปลาได้";
                if (error.code === "permission-denied") {
                  errorMessage = "ไม่มีสิทธิ์ในการลบข้อมูล";
                } else if (error.code === "not-found") {
                  errorMessage = "ไม่พบข้อมูลปลาที่ต้องการลบ";
                }

                Swal.fire({
                  icon: "error",
                  title: "เกิดข้อผิดพลาด!",
                  text: errorMessage,
                  footer: error.message,
                });
              });
          }
        });
      }

      // Add log entry
      function addLog(action, details) {
        if (!currentUser || !db) {
          console.warn("Cannot add log: user or db not available");
          return Promise.resolve();
        }

        const logData = {
          action: action,
          details: details,
          user: {
            uid: currentUser.uid,
            name: currentUser.displayName || "ไม่ทราบชื่อ",
            email: currentUser.email || "ไม่ทราบอีเมล",
          },
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        };

        return db
          .collection("logs")
          .add(logData)
          .then(() => {
            console.log("Log added successfully");
            loadLogs();
            return Promise.resolve();
          })
          .catch((error) => {
            console.error("Error adding log: ", error);
            if (error.code === "permission-denied") {
              console.warn(
                "Permission denied when adding log. Check Firestore rules."
              );
            }
            return Promise.reject(error);
          });
      }

      // Refresh stock button
      refreshStockBtn.addEventListener("click", function () {
        const originalHTML = refreshStockBtn.innerHTML;
        refreshStockBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin me-1"></i> กำลังโหลด...';
        refreshStockBtn.disabled = true;

        afterFishOperation();
        loadLogs();

        setTimeout(() => {
          refreshStockBtn.innerHTML = originalHTML;
          refreshStockBtn.disabled = false;

          Swal.fire({
            icon: "success",
            title: "รีเฟรชแล้ว!",
            text: "ข้อมูลทั้งหมดถูกอัพเดทแล้ว",
            timer: 1500,
            showConfirmButton: false,
          });
        }, 1000);
      });

      // Smooth scrolling for navigation
      document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", function (e) {
          e.preventDefault();

          const targetId = this.getAttribute("href");
          if (targetId === "#") return;

          const targetElement = document.querySelector(targetId);
          if (targetElement) {
            window.scrollTo({
              top: targetElement.offsetTop - 80,
              behavior: "smooth",
            });

            document.querySelectorAll(".nav-link").forEach((link) => {
              link.classList.remove("active");
            });
            this.classList.add("active");
          }
        });
      });

      // Update active nav link on scroll
      window.addEventListener("scroll", function () {
        const sections = document.querySelectorAll(".row[id]");
        const navLinks = document.querySelectorAll(".nav-link");

        let current = "";
        sections.forEach((section) => {
          const sectionTop = section.offsetTop;
          if (scrollY >= sectionTop - 100) {
            current = section.getAttribute("id");
          }
        });

        navLinks.forEach((link) => {
          link.classList.remove("active");
          if (link.getAttribute("href") === `#${current}`) {
            link.classList.add("active");
          }
        });
      });




      // ฟังก์ชันค้นหาปลา - แก้ไขแล้ว
function searchFish(searchTerm) {
    if (!searchTerm.trim()) {
        filteredFishData = [...allFishData];
    } else {
        const term = searchTerm.toLowerCase().trim();
        filteredFishData = allFishData.filter((fish) => {
            // ค้นหาจากชื่อปลาเป็นหลัก
            if (fish.name && fish.name.toLowerCase().includes(term)) {
                return true;
            }
            
            // ค้นหาจากรายละเอียด (ถ้ามี)
            if (fish.description && fish.description.toLowerCase().includes(term)) {
                return true;
            }
            
            // ค้นหาจากสถานะ (ถ้ามี)
            if (fish.status) {
                const statusText = getStatusText(fish.status);
                if (statusText.toLowerCase().includes(term)) {
                    return true;
                }
            }
            
            // ค้นหาจากขนาด (ถ้าคำค้นเป็นตัวเลข)
            if (!isNaN(term) && fish.size) {
                const size = parseFloat(fish.size);
                const searchNum = parseFloat(term);
                if (!isNaN(searchNum) && size === searchNum) {
                    return true;
                }
            }
            
            return false;
        });
    }

    currentPage = 1;
    renderFishTable();
}

// ฟังก์ชันช่วยในการแปลงสถานะเป็นข้อความภาษาไทย
function getStatusText(status) {
    switch (status) {
        case "active":
            return "พร้อมใช้งาน";
        case "inactive":
            return "ไม่พร้อมใช้งาน";
        case "breeding":
            return "กำลังเพาะพันธุ์";
        default:
            return "พร้อมใช้งาน";
    }
}

// เพิ่มฟังก์ชันค้นหาขั้นสูง (optional)
function advancedSearch(searchTerm) {
    if (!searchTerm.trim()) {
        filteredFishData = [...allFishData];
    } else {
        const term = searchTerm.toLowerCase().trim();
        const searchWords = term.split(/\s+/); // แยกคำค้นหา
        
        filteredFishData = allFishData.filter((fish) => {
            // สร้างข้อความสำหรับค้นหาจากทุกรายการ
            const searchableText = `
                ${fish.name || ''}
                ${fish.description || ''}
                ${getStatusText(fish.status || '')}
                ${fish.size || ''}
                ${fish.unit || ''}
                ${fish.quantity || ''}
            `.toLowerCase();
            
            // ตรวจสอบว่าทุกคำค้นหาพบในข้อความหรือไม่
            return searchWords.every(word => 
                searchableText.includes(word)
            );
        });
    }

    currentPage = 1;
    renderFishTable();
}

// แก้ไข event listener สำหรับ search box ให้ใช้ฟังก์ชันค้นหาที่ครอบคลุม
if (fishSearch) {
    fishSearch.addEventListener(
        "input",
        debounce(function () {
            searchFish(this.value);
            // หรือใช้ advancedSearch(this.value); สำหรับการค้นหาที่ครอบคลุมกว่า
        }, 300)
    );
}