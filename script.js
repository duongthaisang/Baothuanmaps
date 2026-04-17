// ==========================================
// --- 1. BẢO MẬT & ĐĂNG NHẬP CƠ BẢN ---
// ==========================================
//const Mật_Khẩu_Của_Bạn = "767679"; 

//function checkLogin() {
//    if (document.getElementById('login-pwd').value === Mật_Khẩu_Của_Bạn) {
//        document.getElementById('login-overlay').style.display = 'none';
//    } else {
 //       document.getElementById('login-err').style.display = 'block';
//}
//function handleLoginEnter(e) { if (e.key === 'Enter') checkLogin(); }

// Chống XSS (Bảo mật khi render text)
//function escapeHTML(str) {
//    if (!str) return '';
//    return str.toString().replace(/[&<>'"]/g, tag => ({ '&': '&', '<': '<', '>': '>', "'": '&#39;', '"': '&quot;' }[tag]));
//}

// ==========================================
// --- 2. CẤU HÌNH BẢN ĐỒ & BIẾN TOÀN CỤC ---
// ==========================================
const defaultPos = [11.610961926975536, 108.11585590451305];
let data = JSON.parse(localStorage.getItem('bt_data')) || { cams: [], hos: [] };
let tempPos = null, previewLayer = null, handleMarker = null, userMarker = null;

const markerRefs = { cams: {}, hos: {} };

const map = L.map('map', { center: defaultPos, zoom: 18, minZoom: 3, maxZoom: 22, zoomControl: false });
L.control.zoom({ position: 'topright' }).addTo(map); 

map.attributionControl.addAttribution('<b style="color:#e67e22;">Made by Dương Thái Sang</b>');

const googleSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 22, subdomains:['mt0','mt1','mt2','mt3']
}).addTo(map);

const layers = L.layerGroup().addTo(map);

// ==========================================
// --- 3. CÁC HÀM TIỆN ÍCH (GPS, CHỈ ĐƯỜNG) ---
// ==========================================
function getNavUrl(lat, lng) {
    return `http://maps.google.com/maps?daddr=${lat},${lng}&ll=`;
}

function locateUser(zoomIn = false) {
    if (!navigator.geolocation) {
        alert("Trình duyệt của bạn không hỗ trợ định vị GPS!"); return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        if (userMarker) userMarker.setLatLng([lat, lng]);
        else userMarker = L.marker([lat, lng], { 
            icon: L.divIcon({ className: 'user-location-dot', iconSize: [14, 14] }) 
        }).addTo(map);
        if (zoomIn) map.flyTo([lat, lng], 19);
    }, (err) => {
        alert("Không thể lấy vị trí. Hãy kiểm tra quyền truy cập vị trí.");
    }, { enableHighAccuracy: true });
}

// ==========================================
// --- 4. TƯƠNG TÁC BẢN ĐỒ & FORM NHẬP LIỆU ---
// ==========================================
map.on('click', (e) => {
    if (handleMarker) return; 
    tempPos = e.latlng;
    L.popup().setLatLng(tempPos).setContent(`
        <div style="text-align:center; padding: 5px;">
            <button class="btn btn-save" style="background:#e67e22; width: 140px; margin-bottom:8px;" onclick="startAdd('camera')">📸 THÊM CAMERA</button><br>
            <button class="btn btn-save ho-bg" style="width: 140px;" onclick="startAdd('household')">🏠 THÊM HỘ DÂN</button>
        </div>
    `).openOn(map);
});

function startAdd(type, editId = null) {
    showTab('add');
    document.getElementById('guide-text').style.display = 'none';
    document.getElementById('form-container').style.display = 'block';
    document.getElementById('edit-id').value = editId || "";
    document.getElementById('form-cam').style.display = (type === 'camera' ? 'block' : 'none');
    document.getElementById('form-ho').style.display = (type === 'household' ? 'block' : 'none');
    
    // --- TỐI ƯU UX CHO MOBILE TẠI ĐÂY ---
    if (window.innerWidth <= 768 && tempPos) {
        const sidePanel = document.getElementById('side-panel');
        const gpsBtn = document.querySelector('.gps-button');

        if (type === 'household') {
            // Hộ dân: Đẩy bảng lên 85% để gõ phím không bị che
            sidePanel.style.height = '85vh';
            if(gpsBtn) gpsBtn.style.bottom = 'calc(85vh + 20px)';
            map.flyTo([tempPos.lat, tempPos.lng], 19, { animate: true });
        } else if (type === 'camera') {
            // Camera: Giữ ở 45%, chừa nửa trên bản đồ để kéo thả marker điều chỉnh bằng tay
            sidePanel.style.height = '45vh';
            if(gpsBtn) gpsBtn.style.bottom = 'calc(45vh + 20px)';
            
            // Dịch bản đồ xuống để điểm camera nằm ở nửa trên màn hình
            setTimeout(() => {
                map.flyTo([tempPos.lat, tempPos.lng], 19, { animate: true });
                setTimeout(() => { map.panBy([0, 150]); }, 300);
            }, 100);
        }
    }

    if (editId) {
        const item = type === 'camera' ? data.cams.find(c => c.id == editId) : data.hos.find(h => h.id == editId);
        tempPos = { lat: item.lat, lng: item.lng };
        if (type === 'camera') {
            document.getElementById('in-cam-name').value = item.name;
            document.getElementById('in-cam-h').value = item.h;
            document.getElementById('in-cam-a').value = item.a || 90;
            document.getElementById('in-cam-r').value = item.r;
        } else {
            document.getElementById('in-ho-name').value = item.name;
            document.getElementById('in-ho-phone').value = item.phone || "";
            document.getElementById('in-ho-addr').value = item.addr || "";
            document.getElementById('in-ho-note').value = item.note || "";
        }
    } else {
        document.getElementById('in-cam-name').value = ""; document.getElementById('in-cam-h').value = 90;
        document.getElementById('in-cam-a').value = 90; document.getElementById('in-cam-r').value = 60;
        document.getElementById('in-ho-name').value = ""; document.getElementById('in-ho-phone').value = "";
        document.getElementById('in-ho-addr').value = ""; document.getElementById('in-ho-note').value = "";
    }

    if (type === 'camera') { initHandle(); liveUpdate(); }
    map.closePopup();
}

function initHandle() {
    if (handleMarker) map.removeLayer(handleMarker);
    const r = parseInt(document.getElementById('in-cam-r').value), h = parseInt(document.getElementById('in-cam-h').value);
    const p = calculateEndPoint(tempPos.lat, tempPos.lng, h, r);
    handleMarker = L.marker([p.lat, p.lng], { 
        draggable: true, 
        icon: L.divIcon({ html: '<div style="width:18px;height:18px;background:white;border:4px solid #e67e22;border-radius:50%;box-shadow:0 0 5px rgba(0,0,0,0.5)"></div>', iconSize: [18,18] }) 
    }).addTo(map);
    
    // Kéo thả trực tiếp trên bản đồ
    handleMarker.on('drag', (e) => {
        document.getElementById('in-cam-r').value = Math.round(map.distance(tempPos, e.target.getLatLng()));
        liveUpdate(false);
    });
}

function liveUpdate(moveHandle = true) {
    if (previewLayer) map.removeLayer(previewLayer);
    const h = parseInt(document.getElementById('in-cam-h').value), a = parseInt(document.getElementById('in-cam-a').value), r = parseInt(document.getElementById('in-cam-r').value);
    document.getElementById('val-h').innerText = h; document.getElementById('val-a').innerText = a; document.getElementById('val-r').innerText = r;
    previewLayer = drawFOV(tempPos.lat, tempPos.lng, h, a, r, '#e67e22').addTo(map);
    if (moveHandle && handleMarker) handleMarker.setLatLng(calculateEndPoint(tempPos.lat, tempPos.lng, h, r));
}

function finalSave(type) {
    const editId = document.getElementById('edit-id').value;
    const id = editId ? parseInt(editId) : Date.now();
    const newItem = { id, lat: tempPos.lat, lng: tempPos.lng };

    if (type === 'camera') {
        newItem.name = document.getElementById('in-cam-name').value || "Camera";
        newItem.h = parseInt(document.getElementById('in-cam-h').value);
        newItem.a = parseInt(document.getElementById('in-cam-a').value);
        newItem.r = parseInt(document.getElementById('in-cam-r').value);
        data.cams = data.cams.filter(c => c.id !== id); data.cams.push(newItem);
    } else {
        newItem.name = document.getElementById('in-ho-name').value || "Hộ dân";
        newItem.phone = document.getElementById('in-ho-phone').value;
        newItem.addr = document.getElementById('in-ho-addr').value;
        newItem.note = document.getElementById('in-ho-note').value;
        data.hos = data.hos.filter(h => h.id !== id); data.hos.push(newItem);
    }
    saveData(); cancelAdd();
}

function cancelAdd() {
    document.getElementById('form-container').style.display = 'none';
    document.getElementById('guide-text').style.display = 'block';
    if (handleMarker) map.removeLayer(handleMarker);
    if (previewLayer) map.removeLayer(previewLayer);
    tempPos = null; handleMarker = null;

    // --- TỰ ĐỘNG HẠ BẢNG ĐIỀU KHIỂN KHI LƯU HOẶC HỦY ---
    if (window.innerWidth <= 768) {
        const sidePanel = document.getElementById('side-panel');
        const gpsBtn = document.querySelector('.gps-button');
        sidePanel.style.height = '15vh'; // Thụt xuống mức thấp nhất
        if (gpsBtn) gpsBtn.style.bottom = 'calc(15vh + 20px)';
    }
}

// ==========================================
// --- 5. RENDER DỮ LIỆU & POPUP CHÍNH ---
// ==========================================
function renderAll() {
    layers.clearLayers(); markerRefs.cams = {}; markerRefs.hos = {};
    
    data.cams.forEach(c => {
        drawFOV(c.lat, c.lng, c.h, c.a || 90, c.r, '#e67e22').addTo(layers);
        const marker = L.circleMarker([c.lat, c.lng], { radius: 6, color: '#e67e22', fillOpacity: 1, weight: 2 }).addTo(layers);
        marker.bindPopup(`
            <div class="popup-container">
                <b class="popup-title">📸 ${escapeHTML(c.name)}</b><br>
                <b>Hướng:</b> ${c.h}° | <b>Tầm xa:</b> ${c.r}m
                <a href="${getNavUrl(c.lat, c.lng)}" target="_blank" class="btn btn-nav btn-full">🗺️ ĐI ĐẾN ĐÂY</a>
                <button class="btn btn-save btn-full" onclick="startAdd('camera', ${c.id})">SỬA CAMERA</button>
            </div>
        `);
        markerRefs.cams[c.id] = marker;
    });

    data.hos.forEach(h => {
        const marker = L.circleMarker([h.lat, h.lng], { radius: 8, color: '#2ecc71', fillOpacity: 1, weight: 2 }).addTo(layers);
        marker.bindPopup(`
            <div class="popup-container">
                <b class="popup-title">🏠 ${escapeHTML(h.name)}</b><br>
                <b>📞 SĐT:</b> ${escapeHTML(h.phone) || 'N/A'}<br>
                <b>📍 Địa chỉ:</b> ${escapeHTML(h.addr) || 'N/A'}<br>
                <b>📝 Ghi chú:</b> <div class="popup-note-box">${escapeHTML(h.note) || 'Không có ghi chú.'}</div>
                <a href="${getNavUrl(h.lat, h.lng)}" target="_blank" class="btn btn-nav btn-full">🗺️ ĐI ĐẾN ĐÂY</a>
                <button class="btn btn-save btn-full ho-bg" onclick="startAdd('household', ${h.id})">SỬA HỘ DÂN</button>
            </div>
        `);
        markerRefs.hos[h.id] = marker;
    });
    refreshList();
}

// ==========================================
// --- 6. TÌM KIẾM THEO KIỂU GOOGLE MAPS ---
// ==========================================
function handleTopSearch() {
    const q = document.getElementById('main-search').value.toLowerCase().trim();
    const dropdown = document.getElementById('search-results-dropdown');
    const clearBtn = document.querySelector('.clear-search');
    
    dropdown.innerHTML = '';
    if (!q) { dropdown.style.display = 'none'; clearBtn.style.display = 'none'; return; }
    clearBtn.style.display = 'inline-block';

    let results = [];
    data.cams.filter(c => c.name.toLowerCase().includes(q)).forEach(c => results.push({...c, type: 'cam'}));
    data.hos.filter(h => h.name.toLowerCase().includes(q) || (h.phone||"").includes(q) || (h.addr||"").toLowerCase().includes(q)).forEach(h => results.push({...h, type: 'ho'}));
    
    if (results.length === 0) {
        dropdown.innerHTML = '<div class="search-item" style="color:#999;text-align:center">Không tìm thấy kết quả</div>';
    } else {
        results.slice(0, 10).forEach(item => {
            const div = document.createElement('div'); div.className = 'search-item';
            div.innerHTML = `<strong>${item.type==='cam'?'📸':'🏠'} ${escapeHTML(item.name)}</strong><br><small style="color:#666">${item.type==='cam'?'Mục Camera':'Mục Hộ Dân'} ${item.phone?' - '+item.phone:''}</small>`;
            div.onclick = () => {
                focusItem(item.type === 'cam' ? 'camera' : 'household', item.id, item.lat, item.lng);
                dropdown.style.display = 'none';
                document.getElementById('main-search').value = item.name;
            };
            dropdown.appendChild(div);
        });
    }
    dropdown.style.display = 'block';
}

function clearSearch() {
    document.getElementById('main-search').value = '';
    document.getElementById('search-results-dropdown').style.display = 'none';
    document.querySelector('.clear-search').style.display = 'none';
}

document.addEventListener('click', (e) => {
    if (!document.getElementById('top-search-bar').contains(e.target)) {
        document.getElementById('search-results-dropdown').style.display = 'none';
    }
});

// ==========================================
// --- 7. QUẢN LÝ DANH SÁCH BÊN TRONG BẢNG ---
// ==========================================
function refreshList() {
    const listBody = document.getElementById('list-body'); listBody.innerHTML = '';
    document.getElementById('stat-cam').innerText = data.cams.length;
    document.getElementById('stat-ho').innerText = data.hos.length;

    listBody.innerHTML += '<div class="list-header">Mục Camera</div>';
    data.cams.forEach(c => listBody.appendChild(createRow('camera', c)));

    listBody.innerHTML += '<div class="list-header">Mục Hộ Dân</div>';
    data.hos.forEach(h => listBody.appendChild(createRow('household', h)));
}

function createRow(type, item) {
    const div = document.createElement('div'); div.className = 'item-row';
    div.innerHTML = `
        <div class="item-info" onclick="focusItem('${type}', ${item.id}, ${item.lat}, ${item.lng})">
            <div style="font-weight:bold;">${escapeHTML(item.name)}</div>
            <div style="font-size:11px; color:#999;">${type==='camera'?'Góc: '+item.h+'°':'SĐT: '+escapeHTML(item.phone||'N/A')}</div>
        </div>
        <a href="${getNavUrl(item.lat, item.lng)}" target="_blank" class="btn-action btn-go" title="Chỉ đường">📍</a>
        <button class="btn-action btn-edit" onclick="startAdd('${type}', ${item.id})">✎</button>
        <button class="btn-action btn-del" onclick="deleteItem('${type}', ${item.id})">🗑</button>
    `;
    return div;
}

function focusItem(type, id, lat, lng) {
    map.flyTo([lat, lng], 20);
    if (window.innerWidth <= 768) {
        const sidePanel = document.getElementById('side-panel');
        const gpsBtn = document.querySelector('.gps-button');
        sidePanel.style.height = '15vh';
        if (gpsBtn) gpsBtn.style.bottom = 'calc(15vh + 20px)';
    }
    setTimeout(() => {
        if (type === 'camera' && markerRefs.cams[id]) markerRefs.cams[id].openPopup();
        if (type === 'household' && markerRefs.hos[id]) markerRefs.hos[id].openPopup();
    }, 400); 
}

function deleteItem(type, id) {
    if (confirm("Xóa mục này khỏi bản đồ?")) {
        if (type === 'camera') data.cams = data.cams.filter(c => c.id !== id);
        else data.hos = data.hos.filter(h => h.id !== id);
        saveData();
    }
}

function saveData() { localStorage.setItem('bt_data', JSON.stringify(data)); renderAll(); }

function showTab(t) {
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-btn-'+t).classList.add('active');
    document.getElementById('panel-add').style.display = t==='add'?'block':'none';
    document.getElementById('panel-manage').style.display = t==='manage'?'block':'none';
}

// ==========================================
// --- 8. TÍNH TOÁN HÌNH HỌC (VẼ GÓC CAMERA) ---
// ==========================================
function drawFOV(lat, lng, h, a, r, color) {
    const pts = [[lat, lng]]; const sH = h - a/2;
    for (let i = 0; i <= 20; i++) {
        pts.push([calculateEndPoint(lat, lng, sH + (i * a/20), r).lat, calculateEndPoint(lat, lng, sH + (i * a/20), r).lng]);
    }
    return L.polygon(pts, { color, weight: 1, fillOpacity: 0.2 });
}

function calculateEndPoint(lat, lng, brng, dist) {
    const R = 6378137, b = brng * Math.PI / 180, l1 = lat * Math.PI / 180, ln1 = lng * Math.PI / 180, dR = dist / R;
    const l2 = Math.asin(Math.sin(l1) * Math.cos(dR) + Math.cos(l1) * Math.sin(dR) * Math.cos(b));
    const ln2 = ln1 + Math.atan2(Math.sin(b) * Math.sin(dR) * Math.cos(l1), Math.cos(dR) - Math.sin(l1) * Math.sin(l2));
    return { lat: l2 * 180 / Math.PI, lng: ln2 * 180 / Math.PI };
}

// ==========================================
// --- 9. XUẤT, NHẬP & GỘP DỮ LIỆU ---
// ==========================================
function exportExcel() {
    let csv = "\ufeffLoại,Tên,SĐT,Địa chỉ,Ghi chú,Lat,Lng\n";
    data.hos.forEach(h => csv += `Hộ Dân,${escapeHTML(h.name)},${escapeHTML(h.phone)},"${escapeHTML(h.addr)}","${escapeHTML((h.note||'').replace(/\n/g, ' '))}",${h.lat},${h.lng}\n`);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })); a.download = "bao_thuan.csv"; a.click();
}
function exportJSON() {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); a.download = "data_backup.json"; a.click();
}
function importJSON(event) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported.cams && imported.hos) { data = imported; saveData(); alert("Đã phục hồi (Ghi đè) dữ liệu thành công!"); }
        } catch(err) { alert("File không hợp lệ!"); }
    };
    if(event.target.files[0]) reader.readAsText(event.target.files[0]); event.target.value = '';
}
function mergeJSON(event) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            let countCam = 0, countHo = 0;
            if (imported.cams) {
                imported.cams.forEach(newCam => {
                    if (!data.cams.some(c => c.id === newCam.id || (c.lat === newCam.lat && c.lng === newCam.lng))) { data.cams.push(newCam); countCam++; }
                });
            }
            if (imported.hos) {
                imported.hos.forEach(newHo => {
                    if (!data.hos.some(h => h.id === newHo.id || (h.lat === newHo.lat && h.lng === newHo.lng))) { data.hos.push(newHo); countHo++; }
                });
            }
            saveData(); alert(`Đã gộp thành công!\n- Thêm mới: ${countCam} Camera.\n- Thêm mới: ${countHo} Hộ dân.`);
        } catch(err) { alert("Lỗi đọc file JSON!"); }
    };
    if(event.target.files[0]) reader.readAsText(event.target.files[0]); event.target.value = '';
}

renderAll();

// ==========================================
// --- 10. LOGIC VUỐT BOTTOM SHEET ---
// ==========================================
const sidePanel = document.getElementById('side-panel'), dragHandle = document.getElementById('drag-handle'), gpsBtn = document.querySelector('.gps-button');
let startY = 0, currentHeight = 0, isDragging = false;

dragHandle.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 768) return;
    startY = e.touches[0].clientY; currentHeight = sidePanel.getBoundingClientRect().height;
    sidePanel.style.transition = 'none'; if(gpsBtn) gpsBtn.style.transition = 'none';
    isDragging = true;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    let newHeight = currentHeight - (e.touches[0].clientY - startY);
    if (newHeight < window.innerHeight * 0.15) newHeight = window.innerHeight * 0.15;
    if (newHeight > window.innerHeight * 0.85) newHeight = window.innerHeight * 0.85;
    sidePanel.style.height = newHeight + 'px';
    if(gpsBtn) gpsBtn.style.bottom = (newHeight + 20) + 'px';
}, { passive: true });

document.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    sidePanel.style.transition = 'height 0.3s ease-out'; if(gpsBtn) gpsBtn.style.transition = 'bottom 0.3s ease-out';
    const percent = sidePanel.getBoundingClientRect().height / window.innerHeight;
    let snap = '45vh'; if (percent < 0.3) snap = '15vh'; else if (percent > 0.6) snap = '85vh';
    sidePanel.style.height = snap; if(gpsBtn) gpsBtn.style.bottom = `calc(${snap} + 20px)`;
});
