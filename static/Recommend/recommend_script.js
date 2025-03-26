let selectedPlaces = [];

function toggleSelection(placeId) {
    const placeElement = document.getElementById(`place-${placeId}`);
    if (selectedPlaces.includes(placeId)) {
        selectedPlaces = selectedPlaces.filter(id => id !== placeId);
        placeElement.classList.remove('selected');
    } else {
        selectedPlaces.push(placeId);
        placeElement.classList.add('selected');
    }
}

function submitSelection() {
    const currentUrlParams = new URLSearchParams(window.location.search);
    
    const newParams = new URLSearchParams();
    selectedPlaces.forEach(id => newParams.append('places', id));
    
    ['age_range', 'gender', 'nationality', 'travel_pref', 'food_pref', 'start_date', 'end_date', 'track_type'].forEach(param => {
        if (currentUrlParams.has(param)) {
            newParams.append(param, currentUrlParams.get(param));
        }
    });
    
    window.location.href = `/Order?${newParams.toString()}`;
}