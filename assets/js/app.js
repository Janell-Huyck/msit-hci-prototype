document.addEventListener('DOMContentLoaded', function() {
    const CURRENT_SEMESTER = window._currentSemester || ''; // “summer”, “fall” or "" on All Terms
    const toastEl = document.getElementById('enrollToast');
    const toastBody = toastEl.querySelector('.toast-body');
    const TOAST = new bootstrap.Toast(toastEl);
    // Supports both 4 and 5 column layouts:
    const row = document.querySelector('.row-cols-md-4') || document.querySelector('.row-cols-md-5');

    // 1) Nested submenu toggle
    document.querySelectorAll('.dropdown-submenu > .dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            const parent = toggle.parentElement;
            document.querySelectorAll('.dropdown-submenu')
                .forEach(sm => sm !== parent && sm.classList.remove('show'));
            parent.classList.toggle('show');
        });
    });
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-submenu')
            .forEach(sm => sm.classList.remove('show'));
    });

    // 2) Helpers to remove/add Enroll buttons
    function disableEnrollButtons(code) {
        document.querySelectorAll(`.enroll-btn[data-code="${code}"]`)
            .forEach(btn => btn.remove());
    }
    function enableEnrollButton(code, sem) {
        const card = document.querySelector(`.card[data-code="${code}"][data-semester="${sem}"]`);
        if (!card || card.querySelector('.enroll-btn')) return;
        const btn = document.createElement('a');
        btn.href = '#';
        btn.className = 'btn btn-primary btn-sm enroll-btn';
        btn.dataset.code = code;
        btn.textContent = 'Enroll';
        const header = card.querySelector('.card-body .d-flex');
        const collapse = header ? header.querySelector('[data-bs-toggle="collapse"]') : null;
        // If header and collapse exist, insert before collapse. Otherwise, append at end.
        if (header && collapse) {
            header.insertBefore(btn, collapse);
        } else if (header) {
            header.appendChild(btn);
        }
    }

    // 3) Click handler for Enroll & Un-enroll
    document.body.addEventListener('click', function(e) {
        const t = e.target;
        let code, storedTerm;
        if (t.matches('.enroll-btn')) {
            e.preventDefault();
            code = t.dataset.code;
            storedTerm = CURRENT_SEMESTER || 'all';
            localStorage.setItem(`enrolled-${code}`, storedTerm);
            disableEnrollButtons(code);
            toastBody.textContent = `Enrolled in ${code} (${storedTerm})`;
            TOAST.show();
            renderEnrollments();
        }
        else if (t.matches('.unenroll-btn')) {
            e.preventDefault();
            code = t.dataset.code;
            storedTerm = localStorage.getItem(`enrolled-${code}`) || 'all';
            localStorage.removeItem(`enrolled-${code}`);
            toastBody.textContent = `Un-enrolled from ${code}`;
            TOAST.show();
            renderEnrollments();
            // No direct enableEnrollButton call here!
        }
    });

    // 4) Build / rebuild My Enrollments column and all Enroll buttons
    function renderEnrollments() {
        const old = document.getElementById('my-enrollments-col');
        if (old) {
            old.remove();
            // Return to 4 columns if the enrollments col is being removed
            row.classList.replace('row-cols-md-5','row-cols-md-4');
        }

        // collect enrolled codes
        const keys = Object.keys(localStorage).filter(k => k.startsWith('enrolled-'));
        if (keys.length === 0) {
            // On empty, restore all enroll buttons for the current view
            restoreAllEnrollButtons();
            return;
        }

        // group courses by stored term
        const groups = { summer: [], fall: [], all: [] };
        const allLists = Object.values(window._msitCourses);
        keys.forEach(k => {
            const code = k.replace('enrolled-','');
            let term = localStorage.getItem(k) || 'all';
            if (!groups.hasOwnProperty(term)) term = 'all';
            let course = null;
            for (const list of allLists) {
                course = list.find(c => c.code === code);
                if (course) break;
            }
            if (course) groups[term].push(course);
        });

        if (!groups.summer.length && !groups.fall.length && !groups.all.length) {
            restoreAllEnrollButtons();
            return;
        }

        // expand grid to 5 columns
        row.classList.replace('row-cols-md-4','row-cols-md-5');

        // MAIN ENROLLMENTS COLUMN: use flex and h-100 for full height and scrolling!
        const col = document.createElement('div');
        col.id = 'my-enrollments-col';
        col.className = 'col h-100 d-flex flex-column';

        // Make the column's content a card, like other columns
        const card = document.createElement('div');
        card.className = 'card h-100 d-flex flex-column';

        // Card header
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-body flex-grow-0 d-flex align-items-end';
        cardHeader.style.height = '80px';
        cardHeader.style.borderBottom = '1px solid #dee2e6';
        cardHeader.innerHTML = `<h5 class="card-title text-center w-100 pb-2 m-0">My Enrollments</h5>`;

        // Scrollable enrollments list
        const wrapper = document.createElement('div');
        wrapper.className = 'enrollments-list flex-grow-1 d-flex flex-column';
        wrapper.style.overflowY = 'auto';
        wrapper.style.minHeight = '0';
        wrapper.style.padding = '0.75rem';

        ['summer','fall','all'].forEach(sem => {
            const list = groups[sem];
            if (!list.length) return;
            const h6 = document.createElement('h6');
            h6.className = 'mt-3 mb-1';
            h6.textContent = sem === 'all' ? 'All Terms' : sem.charAt(0).toUpperCase()+sem.slice(1);
            wrapper.appendChild(h6);
            list.forEach(course => {
                const courseCard = document.createElement('div');
                courseCard.className = 'card mb-2 position-relative';
                courseCard.innerHTML = `
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h5 class="card-title mb-0">${course.title}</h5>
                            <button type="button" class="btn btn-sm btn-danger unenroll-btn" data-code="${course.code}">
                                Un-enroll
                            </button>
                        </div>
                        <p class="mb-1"><strong>${course.code}</strong></p>
                        <p class="mb-1">${course.semesters.join(', ')}</p>
                    </div>`;
                wrapper.appendChild(courseCard);
            });
        });

        // Compose card
        card.appendChild(cardHeader);
        card.appendChild(wrapper);

        // Add card to col, col to row
        col.appendChild(card);
        row.appendChild(col);

        // After updating columns, restore all enroll buttons for visible cards
        restoreAllEnrollButtons();
    }

    // Helper: restore all Enroll buttons for courses not currently enrolled
    function restoreAllEnrollButtons() {
        // Find all course cards in the DOM that should have an Enroll button
        // A course is eligible if it's not in localStorage (not enrolled)
        // Loop over all visible course cards in the main columns
        document.querySelectorAll('.card[data-code][data-semester]').forEach(card => {
            const code = card.getAttribute('data-code');
            const sem = card.getAttribute('data-semester');
            if (!localStorage.getItem(`enrolled-${code}`)) {
                enableEnrollButton(code, sem);
            } else {
                // Defensive: remove stray enroll buttons if they're there for enrolled courses
                disableEnrollButtons(code);
            }
        });
    }

    // 5) On load: build enrollments and buttons appropriately
    renderEnrollments();
});
