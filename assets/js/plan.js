document.addEventListener('DOMContentLoaded', function() {
    const planView = document.getElementById('plan-view');
    if (!planView) return;

    // --- Helper constants and mappings ---
    const semesters = [
        "Fall 2023", "Spring 2024", "Summer 2024",
        "Fall 2024", "Spring 2025", "Summer 2025",
        "Fall 2025", "Spring 2026", "Summer 2026", "Fall 2026"
    ];
    const planningStartIdx = semesters.indexOf("Summer 2025");

    // Map short terms to demo semesters
    function mapTermToSemester(term) {
        term = (term || '').toLowerCase().trim();
        if (term === "summer") return "Summer 2025";
        if (term === "fall") return "Fall 2025";
        if (term === "spring") return "Spring 2025";
        // fallback
        return semesters[semesters.length - 1];
    }

    // --- Data extraction helpers ---
    function flattenAndTagCourses() {
        const raw = window._msitCourses;
        return [].concat(
            (raw.core || []).map(c => ({ ...c, type: 'core' })),
            (raw.it_electives || []).map(c => ({ ...c, type: 'it_elective' })),
            (raw.non_it_electives || []).map(c => ({ ...c, type: 'non_it_elective' })),
            (raw.capstone || []).map(c => ({ ...c, type: 'capstone' }))
        );
    }

    function getEnrolledFromStorage() {
        return Object.keys(localStorage)
            .filter(k => k.startsWith('enrolled-'))
            .map(k => ({
                code: k.replace('enrolled-', ''),
                term: localStorage.getItem(k)
            }));
    }

    // --- Prepare all relevant course lists ---
    const allCourses = flattenAndTagCourses();
    const enrolledArr = getEnrolledFromStorage();

    // Lookups for performance
    const enrolledCodes = new Set(enrolledArr.map(e => e.code));
    const takenCodes = new Set(allCourses.filter(c => c.taken).map(c => c.code));

    // --- Gather needed courses for Cybersecurity plan ---
    // Get all Core courses not yet taken or enrolled
    const coreNeeded = allCourses.filter(
        c => c.type === 'core' && !takenCodes.has(c.code) && !enrolledCodes.has(c.code)
    );
    // IT electives with Cybersecurity track
    const itNeeded = allCourses.filter(
        c => c.type === 'it_elective'
            && c.track && c.track.toLowerCase() === 'cybersecurity'
            && !takenCodes.has(c.code) && !enrolledCodes.has(c.code)
    );
    // Non-IT electives with Cybersecurity track
    const nonItNeeded = allCourses.filter(
        c => c.type === 'non_it_elective'
            && c.track && c.track.toLowerCase() === 'cybersecurity'
            && !takenCodes.has(c.code) && !enrolledCodes.has(c.code)
    );
    // Only Capstone, not Thesis, and not yet taken or enrolled
    const capstoneList = allCourses.filter(
        c => c.type === 'capstone' && !/thesis/i.test(c.title) && !takenCodes.has(c.code) && !enrolledCodes.has(c.code)
    );
    const realCapstone = capstoneList[0];

    // --- Taken & Enrolled Courses ---
    const takenCourses = allCourses.filter(c => c.taken);
    const enrolledCourses = allCourses.filter(c => enrolledCodes.has(c.code));
    enrolledCourses.forEach(c => {
        const e = enrolledArr.find(e => e.code === c.code);
        if (e) c.enrolledTerm = mapTermToSemester(e.term);
    });

    // --- Build the empty plan: a map from semester -> array of courses ---
    const plan = {};
    semesters.forEach(sem => plan[sem] = []);

    // Place already taken courses into their actual semesters
    takenCourses.forEach(c => {
        if (semesters.includes(c.taken)) {
            plan[c.taken].push({ ...c, status: 'Taken' });
        }
    });

    // Place enrolled courses into their mapped demo semesters
    enrolledCourses.forEach(c => {
        if (plan[c.enrolledTerm]) plan[c.enrolledTerm].push({ ...c, status: 'Enrolled' });
    });

    // --- Plan all remaining required courses starting at Summer 2025 ---
    let plannedNeeded = [...coreNeeded, ...itNeeded, ...nonItNeeded];
    let semesterIdx = planningStartIdx;

    // Plan up to 3 courses per semester
    while (plannedNeeded.length > 0 && semesterIdx < semesters.length) {
        const sem = semesters[semesterIdx];
        let numCourses = plan[sem].length;
        while (numCourses < 3 && plannedNeeded.length > 0) {
            plan[sem].push({ ...plannedNeeded.shift(), status: 'Planned' });
            numCourses++;
        }
        semesterIdx++;
    }

    // --- Place Capstone in the last semester with any planned/enrolled/taken classes (max 3), else next available ---
    if (realCapstone) {
        // Find the last semester (after planningStartIdx) with at least one planned/enrolled/taken course, with room for capstone
        let placed = false;
        for (let i = semesters.length - 1; i >= planningStartIdx; i--) {
            const sem = semesters[i];
            if (plan[sem].length > 0 && plan[sem].length < 3) {
                plan[sem].push({ ...realCapstone, status: 'Planned' });
                placed = true;
                break;
            }
        }
        // If not placed, put it in the first empty semester after planningStartIdx
        if (!placed) {
            for (let i = planningStartIdx; i < semesters.length; i++) {
                const sem = semesters[i];
                if (plan[sem].length === 0) {
                    plan[sem].push({ ...realCapstone, status: 'Planned' });
                    placed = true;
                    break;
                }
            }
        }
        // Fallback: put it in the last semester
        if (!placed) {
            plan[semesters[semesters.length - 1]].push({ ...realCapstone, status: 'Planned' });
        }
    }

    // --- Render the plan ---
    function renderPlan(plan, semesters) {
        let html = `<div class="row row-cols-1 row-cols-md-4 g-4">`;
        semesters.forEach(sem => {
            if (plan[sem].length === 0) return;
            html += `<div class="col"><div class="card h-100 d-flex flex-column">`;
            html += `<div class="card-body flex-grow-0 d-flex align-items-end" style="height: 70px;">
                        <h5 class="card-title text-center w-100 border-bottom pb-2 m-0">${sem}</h5>
                    </div>`;
            html += `<div class="card-body pt-3 px-2 flex-grow-1" style="overflow-y: auto; max-height: 50vh;">`;
            plan[sem].forEach(c => {
                html += `<div class="mb-2">
                    <strong>${c.title}</strong> 
                    <span class="badge bg-${
                    c.status === 'Taken' ? 'secondary' :
                        c.status === 'Enrolled' ? 'primary' : 'success'
                }">${c.status}</span><br/>
                    <small>${c.code}${c.credits ? ' • ' + c.credits + ' credits' : ''}</small>
                </div>`;
            });
            html += `</div></div></div>`;
        });
        html += `</div>`;
        planView.innerHTML = html;
    }

    renderPlan(plan, semesters);
});
