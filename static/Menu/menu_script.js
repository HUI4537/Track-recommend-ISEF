document.addEventListener("DOMContentLoaded", function() {

    const hamburgerMenu = document.getElementById('hamburger-menu');
    const sidebar = document.getElementById('sidebar');

    // Toggle sidebar when clicking on the hamburger menu
    hamburgerMenu.addEventListener('click', function(event) {
        event.stopPropagation();
        sidebar.classList.toggle('active');
        console.log("it works")
    });

    // Close sidebar when clicking outside of it
    document.addEventListener('click', function(event) {
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickInsideMenu = hamburgerMenu.contains(event.target);
        
        if (!isClickInsideSidebar && !isClickInsideMenu) {
            sidebar.classList.remove('active');
        }
    });
});
