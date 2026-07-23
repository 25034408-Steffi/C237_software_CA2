// Heart button toggles a favourite via fetch instead of a normal link
// navigation, so the page doesn't reload and jump back to the top.
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.fav-toggle').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            fetch(link.getAttribute('href'), { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                .then(res => res.json())
                .then(data => {
                    // the favourites list only ever shows favourited dishes,
                    // so un-favouriting there removes the card instead of
                    // just flipping the icon
                    if (link.dataset.removeOnUnfav && !data.is_fav) {
                        const card = link.closest('.col');
                        const grid = link.closest('#favouritesGrid');
                        if (card) card.remove();
                        if (grid && grid.children.length === 0) {
                            const alert = document.getElementById('noFavAlert');
                            if (alert) alert.classList.remove('d-none');
                        }
                        return;
                    }
                    const icon = link.querySelector('i');
                    if (data.is_fav) {
                        icon.classList.remove('bi-heart', 'text-secondary');
                        icon.classList.add('bi-heart-fill', 'text-danger');
                    } else {
                        icon.classList.remove('bi-heart-fill', 'text-danger');
                        icon.classList.add('bi-heart', 'text-secondary');
                    }
                })
                .catch(() => { window.location.href = link.getAttribute('href'); });
        });
    });
});
