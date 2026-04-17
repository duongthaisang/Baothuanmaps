// ==========================================
// --- 1. CẤU HÌNH BẢN ĐỒ & BIẾN TOÀN CỤC ---
// ==========================================
const defaultPos = [11.610961926975536, 108.11585590451305];

// [BẢO VỆ CHỐNG CRASH] Xử lý lỗi khi điện thoại chặn LocalStorage (Tab ẩn danh)
let data = { cams: [], hos: [] };
try {
    const storedData = localStorage.getItem('bt_data');
    if (storedData) data = JSON.parse(storedData);
} catch (error) {
    console.warn("Điện thoại chặn LocalStorage, sẽ dùng dữ liệu trống tạm thời.");
}
if (!data.cams) data.cams = [];
if (!data.hos) data.hos = [];

let tempPos = null, previewLayer = null, handleMarker = null, userMarker = null;
const markerRefs = { cams: {}, hos: {} };

const map = L.map('map', { center: defaultPos, zoom: 18, minZoom: 3, maxZoom: 22, zoomControl: false });
L.control.zoom({ position: 'topright' }).addTo(map);
map.attributionControl.addAttribution('<b style="color:#e67e22;">Dương Thái Sang</b>');

// Layer Vệ Tinh Google (Khóa maxNativeZoom ở 19 để chống màn hình đen)
L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { 
    maxZoom: 22, maxNativeZoom: 19, subdomains:['mt0','mt1','mt2','mt3'] 
}).addTo(map);

// Tạm thời TẮT Layer Offline để tránh làm treo điện thoại khi chưa có thư mục ảnh. 
// Nếu bạn có file ảnh offline thật, hãy xóa dấu // ở 3 dòng dưới để bật lại.
/*
L.tileLayer('baothuan_tiles/{z}/{x}/{y}.jpg', {
    maxZoom: 22, maxNativeZoom: 18, minZoom: 1, noWrap: true, opacity: 1.0
}).addTo(map);
*/

const layers = L.layerGroup().addTo(map);

function escapeHTML(str) { return str ? str.toString().replace(/[&<>'"]/g, tag => ({ '&': '&', '<': '<', '>': '>', "'": '&#39;', '"': '&quot;' }[tag])) : ''; }

// Cập nhật link dẫn đường chuẩn API của Google Maps
function getNavUrl(lat, lng) { return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`; }

function locateUser(zoomIn = false) {
    if (!navigator.geolocation) { alert("Trình duyệt không hỗ trợ GPS!"); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        if (userMarker) userMarker.setLatLng([lat, lng]);
        else userMarker = L.marker([lat, lng], { icon: L.divIcon({ className: 'user-location-dot', iconSize: [14, 14] }) }).addTo(map);
        if (zoomIn) map.flyTo([lat, lng], 19);
    }, (err) => { alert("Vui lòng cấp quyền vị trí cho trang web để dùng tính năng này."); }, { enableHighAccuracy: true });
}

// ==========================================
// --- 2. TƯƠNG TÁC BẢN ĐỒ & FORM NHẬP LIỆU ---
// ==========================================
map.on('click', (e) => {
    if (handleMarker) return;
    tempPos = e.latlng;
    L.popup().setLatLng(tempPos).setContent(`
        <div style="text-align:center;">
            <button class="btn btn-save" style="background:#e67e22; width:130px; margin-bottom:5px;" onclick="startAdd('camera')">📸 THÊM CAMERA</button><br>
            <button class="btn btn-save ho-bg" style="width:130px;" onclick="startAdd('household')">🏠 THÊM HỘ DÂN</button>
        </div>
    `).openOn(map);
});

function startAdd(type, editId = null) {
    showTab('add');
    const panel = document.getElementById('side-panel');
    const gpsBtn = document.querySelector('.gps-button');

    if (window.innerWidth <= 768 && panel) {
        const height = type === 'household' ? '85vh' : '45vh';
        panel.style.height = height;
        if (gpsBtn) gpsBtn.style.bottom = `calc(${height} + 20px)`;
    }

    document.getElementById('guide-text').style.display = 'none';
    document.getElementById('form-container').style.display = 'block';
    document.getElementById('edit-id').value = editId || "";
    document.getElementById('form-cam').style.display = (type === 'camera' ? 'block' : 'none');
    document.getElementById('form-ho').style.display = (type === 'household' ? 'block' : 'none');

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

    if (type === 'camera') { 
        initHandle(); liveUpdate();
        if(window.innerWidth <= 768) {
            setTimeout(() => { map.flyTo([tempPos.lat, tempPos.lng], 19); setTimeout(() => map.panBy([0, 100]), 300); }, 100);
        }
    }
    map.closePopup();
}

// Logic kéo Marker để chỉnh Góc & Tầm xa Camera
function initHandle() {
    if (handleMarker) map.removeLayer(handleMarker);
    const r = parseInt(document.getElementById('in-cam-r').value), h = parseInt(document.getElementById('in-cam-h').value);
    const p = calculateEndPoint(tempPos.lat, tempPos.lng, h, r);
    handleMarker = L.marker([p.lat, p.lng], { 
        draggable: true, 
        icon: L.divIcon({ html: '<div style="width:22px;height:22px;background:white;border:4px solid #e67e22;border-radius:50%;box-shadow:0 0 10px rgba(0,0,0,0.5)"></div>', iconSize: [22,22] }) 
    }).addTo(map);
    
    handleMarker.on('drag', (e) => {
        const newPos = e.target.getLatLng();
        const dist = Math.round(map.distance(tempPos, newPos));
        const lat1 = tempPos.lat * Math.PI/180, lng1 = tempPos.lng * Math.PI/180;
        const lat2 = newPos.lat * Math.PI/180, lng2 = newPos.lng * Math.PI/180;
        const y = Math.sin(lng2-lng1) * Math.cos(lat2);
        const x = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(lng2-lng1);
        let brng = Math.atan2(y, x) * 180/Math.PI;
        brng = (brng + 360) % 360;

        document.getElementById('in-cam-r').value = dist;
        document.getElementById('in-cam-h').value = Math.round(brng);
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
        newItem.h = parseInt(document.getElementById('in-cam-h').value); newItem.a = parseInt(document.getElementById('in-cam-a').value); newItem.r = parseInt(document.getElementById('in-cam-r').value);
        data.cams = data.cams.filter(c => c.id !== id); data.cams.push(newItem);
    } else {
        newItem.name = document.getElementById('in-ho-name').value || "Hộ dân";
        newItem.phone = document.getElementById('in-ho-phone').value; newItem.addr = document.getElementById('in-ho-addr').value; newItem.note = document.getElementById('in-ho-note').value;
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

    if (window.innerWidth <= 768) {
        const sidePanel = document.getElementById('side-panel');
        if (sidePanel) sidePanel.style.height = '15vh';
        const gpsBtn = document.querySelector('.gps-button');
        if(gpsBtn) gpsBtn.style.bottom = 'calc(15vh + 20px)';
    }
}

// ==========================================
// --- 3. RENDER DỮ LIỆU & POPUP CHÍNH ---
// ==========================================
function renderAll() {
    layers.clearLayers();
    data.cams.forEach(c => {
        drawFOV(c.lat, c.lng, c.h, c.a || 90, c.r, '#e67e22').addTo(layers);
        const m = L.circleMarker([c.lat, c.lng], { radius: 6, color: '#e67e22', fillOpacity: 1 }).addTo(layers);
        m.bindPopup(`<div class="popup-container"><b>📸 ${escapeHTML(c.name)}</b><br>Hướng: ${c.h}°<a href="${getNavUrl(c.lat, c.lng)}" target="_blank" class="btn btn-nav">🗺️ CHỈ ĐƯỜNG</a><button class="btn btn-save btn-full" onclick="startAdd('camera', ${c.id})">SỬA</button></div>`);
        markerRefs.cams[c.id] = m;
    });
    data.hos.forEach(h => {
        const m = L.circleMarker([h.lat, h.lng], { radius: 8, color: '#2ecc71', fillOpacity: 1 }).addTo(layers);
        m.bindPopup(`<div class="popup-container"><b>🏠 ${escapeHTML(h.name)}</b><br>📞 ${escapeHTML(h.phone)}<div class="popup-note-box">${escapeHTML(h.note)}</div><a href="${getNavUrl(h.lat, h.lng)}" target="_blank" class="btn btn-nav">🗺️ CHỈ ĐƯỜNG</a><button class="btn btn-save btn-full ho-bg" onclick="startAdd('household', ${h.id})">SỬA</button></div>`);
        markerRefs.hos[h.id] = m;
    });
    refreshList();
}

// ==========================================
// --- 4. TÌM KIẾM SÂU ---
// ==========================================
function handleTopSearch() {
    const q = document.getElementById('main-search').value.toLowerCase().trim();
    const dropdown = document.getElementById('search-results-dropdown');
    dropdown.innerHTML = '';
    if (!q) { dropdown.style.display = 'none'; return; }

    let res = [];
    data.cams.filter(c => c.name.toLowerCase().includes(q)).forEach(c => res.push({...c, type: 'cam'}));
    data.hos.filter(h => 
        h.name.toLowerCase().includes(q) || 
        (h.phone||"").includes(q) || 
        (h.addr||"").toLowerCase().includes(q) || 
        (h.note||"").toLowerCase().includes(q)
    ).forEach(h => res.push({...h, type: 'ho'}));

    if (res.length === 0) dropdown.innerHTML = '<div class="search-item" style="color:#999">Không tìm thấy</div>';
    else {
        res.slice(0, 10).forEach(item => {
            const div = document.createElement('div'); div.className = 'search-item';
            div.innerHTML = `<strong>${item.type==='cam'?'📸':'🏠'} ${escapeHTML(item.name)}</strong><br><small>${item.phone || item.addr || ''}</small>`;
            div.onclick = () => { focusItem(item.type==='cam'?'camera':'household', item.id, item.lat, item.lng); dropdown.style.display='none'; };
            dropdown.appendChild(div);
        });
    }
    dropdown.style.display = 'block';
}

function clearSearch() { document.getElementById('main-search').value = ''; document.getElementById('search-results-dropdown').style.display='none'; }

function focusItem(type, id, lat, lng) {
    map.flyTo([lat, lng], 19); // Mức zoom an toàn
    if (window.innerWidth <= 768) {
        const sidePanel = document.getElementById('side-panel');
        if (sidePanel) sidePanel.style.height = '15vh';
        const gpsBtn = document.querySelector('.gps-button');
        if(gpsBtn) gpsBtn.style.bottom = 'calc(15vh + 20px)';
    }
    setTimeout(() => {
        const m = type === 'camera' ? markerRefs.cams[id] : markerRefs.hos[id];
        if(m) m.openPopup();
    }, 400);
}

function refreshList() {
    const body = document.getElementById('list-body'); body.innerHTML = '';
    document.getElementById('stat-cam').innerText = data.cams.length;
    document.getElementById('stat-ho').innerText = data.hos.length;
    data.cams.forEach(c => body.appendChild(createRow('camera', c)));
    data.hos.forEach(h => body.appendChild(createRow('household', h)));
}

function createRow(type, item) {
    const div = document.createElement('div'); div.className = 'item-row';
    div.innerHTML = `<div style="flex:1" onclick="focusItem('${type}', ${item.id}, ${item.lat}, ${item.lng})"><b>${escapeHTML(item.name)}</b><br><small>${item.phone || item.h+'°'}</small></div><button class="btn-action btn-edit" onclick="startAdd('${type}', ${item.id})">✎</button><button class="btn-action btn-del" onclick="deleteItem('${type}', ${item.id})">🗑</button>`;
    return div;
}

function deleteItem(type, id) { if(confirm("Xóa mục này?")) { if(type==='camera') data.cams=data.cams.filter(c=>c.id!==id); else data.hos=data.hos.filter(h=>h.id!==id); saveData(); } }

function saveData() { 
    try { localStorage.setItem('bt_data', JSON.stringify(data)); } 
    catch(e) { console.warn("Lưu thất bại do điện thoại chặn bộ nhớ"); }
    renderAll(); 
}

function showTab(t) { 
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active')); 
    document.getElementById('tab-btn-'+t).classList.add('active');
    document.getElementById('panel-add').style.display = t==='add'?'block':'none';
    document.getElementById('panel-manage').style.display = t==='manage'?'block':'none';
}

function drawFOV(lat, lng, h, a, r, color) {
    const pts = [[lat, lng]]; const sH = h - a/2;
    for (let i = 0; i <= 20; i++) { pts.push([calculateEndPoint(lat, lng, sH + (i * a/20), r).lat, calculateEndPoint(lat, lng, sH + (i * a/20), r).lng]); }
    return L.polygon(pts, { color, weight: 1, fillOpacity: 0.2 });
}

function calculateEndPoint(lat, lng, brng, dist) {
    const R = 6378137, b = brng * Math.PI/180, l1 = lat * Math.PI/180, ln1 = lng * Math.PI/180, dR = dist/R;
    const l2 = Math.asin(Math.sin(l1)*Math.cos(dR) + Math.cos(l1)*Math.sin(dR)*Math.cos(b));
    const ln2 = ln1 + Math.atan2(Math.sin(b)*Math.sin(dR)*Math.cos(l1), Math.cos(dR)-Math.sin(l1)*Math.sin(l2));
    return { lat: l2 * 180/Math.PI, lng: ln2 * 180/Math.PI };
}

// ==========================================
// --- 5. TÍNH NĂNG XUẤT/NHẬP/GỘP DỮ LIỆU ---
// ==========================================
function exportExcel() {
    let csv = "\ufeffLoại,Tên,SĐT,Địa chỉ,Ghi chú,Lat,Lng\n";
    data.hos.forEach(h => csv += `Hộ Dân,${escapeHTML(h.name)},${escapeHTML(h.phone)},"${escapeHTML(h.addr)}","${escapeHTML(h.note)}",${h.lat},${h.lng}\n`);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"})); a.download="data.csv"; a.click();
}
function exportJSON() {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], {type:"application/json"})); a.download="backup.json"; a.click();
}
function mergeJSON(e) {
    const r = new FileReader(); r.onload = (ev) => {
        try {
            const imp = JSON.parse(ev.target.result);
            if(imp.cams) imp.cams.forEach(nc => { if(!data.cams.some(c=>c.id===nc.id)) data.cams.push(nc); });
            if(imp.hos) imp.hos.forEach(nh => { if(!data.hos.some(h=>h.id===nh.id)) data.hos.push(nh); });
            saveData(); alert("Gộp dữ liệu thành công!");
        } catch(err) { alert("File lỗi!"); }
    }; if(e.target.files[0]) r.readAsText(e.target.files[0]);
}
function importJSON(e) {
    const r = new FileReader(); r.onload = (ev) => { 
        try { data = JSON.parse(ev.target.result); saveData(); alert("Phục hồi thành công!"); } 
        catch(err) { alert("File lỗi!"); }
    }; if(e.target.files[0]) r.readAsText(e.target.files[0]);
}

renderAll();

// ==========================================
// --- 6. LOGIC VUỐT ĐIỀU KHIỂN (MOBILE) ---
// ==========================================
const sidePanel = document.getElementById('side-panel'), dragHandle = document.getElementById('drag-handle'), gpsBtn = document.querySelector('.gps-button');
let startY = 0, currentHeight = 0, isDragging = false;

if (dragHandle) {
    dragHandle.addEventListener('touchstart', (e) => {
        if (window.innerWidth > 768) return;
        startY = e.touches[0].clientY; currentHeight = sidePanel.getBoundingClientRect().height;
        sidePanel.style.transition = 'none'; isDragging = true;
    }, { passive: true });
}

document.addEventListener('touchmove', (e) => {
    if (!isDragging || !sidePanel) return;
    let newH = currentHeight - (e.touches[0].clientY - startY);
    if (newH < window.innerHeight * 0.15) newH = window.innerHeight * 0.15;
    if (newH > window.innerHeight * 0.85) newH = window.innerHeight * 0.85;
    sidePanel.style.height = newH + 'px';
    if(gpsBtn) gpsBtn.style.bottom = (newH + 20) + 'px';
}, { passive: true });

document.addEventListener('touchend', () => {
    if (!isDragging || !sidePanel) return; 
    isDragging = false;
    sidePanel.style.transition = 'height 0.3s ease';
    const p = sidePanel.getBoundingClientRect().height / window.innerHeight;
    let snap = '15vh'; if(p > 0.3) snap = '45vh'; if(p > 0.6) snap = '85vh';
    sidePanel.style.height = snap; if(gpsBtn) gpsBtn.style.bottom = `calc(${snap} + 20px)`;
});
