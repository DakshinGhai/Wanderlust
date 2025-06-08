window.initMap = function () {
  const mapDiv = document.getElementById("map");
  const lat = parseFloat(mapDiv.dataset.lat) || 26.9124;
  const lng = parseFloat(mapDiv.dataset.lng) || 75.7873;
  const locationName = mapDiv.dataset.location || "Unknown";

  const location = { lat: lat, lng: lng };

  const map = new google.maps.Map(mapDiv, {
    zoom: 12,
    center: location,
  });

  const marker = new google.maps.Marker({
    position: location,
    map: map,
    title: `${locationName} Location`,
  });

  // 👇 Replace the content below with any HTML or plain text you want
  const customText = `
    <div style="font-family: Arial; font-size: 14px;">
      <strong>Welcome to ${locationName}!</strong><br>
      Exact location provided after booking.<br>
      📍 Latitude: ${lat.toFixed(4)}<br>
      📍 Longitude: ${lng.toFixed(4)}
    </div>
  `;

  const infoWindow = new google.maps.InfoWindow({
    content: customText,
  });

  marker.addListener("mouseover", () => {
    infoWindow.open(map, marker);
  });

  marker.addListener("mouseout", () => {
    infoWindow.close();
  });
};
