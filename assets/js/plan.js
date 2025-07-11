document.addEventListener('DOMContentLoaded', function() {
    const planView = document.getElementById('plan-view');
    if (!planView) return;

    // 1. Prep all courses from window._msitCourses (flattened)
    const allCourses = Object.values(window._msitCourses).flat();

    // 2. Find "taken" courses
    const takenCourses = allCourses.filter(c => c.taken);
    // Map: semester -> [courses]
    const takenBySemester = {};
    takenCourses.forEach(c => {
        if (!takenBySemester[c.taken]) takenBySemester[c.taken] = [];
        takenBySemester[c.taken].push(c);
    });

    // 3. Find "enrolled" courses
    const enrolled = Object.keys(localStorage)
        .filter(k => k.startsWith('enrolled-'))
        .map(k => {
            const code = k.replace('enrolled-','');
            const term = localStorage.getItem(k); // 'summer', 'fall', etc.
            return { code, term };
        });
    const enrolledCourses = allCourses.filter(c =>
        enrolled.some(e => e.code === c.code)
    );
    // Optionally, add a fake "enrolledTerm" property to each
    enrolledCourses.forEach(c => {
        const e = enrolled.find(e => e.code === c.code);
        if (e) c.enrolledTerm = e.term;
    });

    // 4. Needed classes
    //   Core: type = "core"
    //   IT Electives: type = "it_elective" && track = "Cybersecurity"
    //   Non-IT Electives: type = "non_it_elective" && track = "Cybersecurity"
    //   Capstone: type = "capstone" (not "thesis")

    // Let's assume you can distinguish type by how you loaded them from YAML, or by a property
    function notTakenOrEnrolled(c) {
        return !c.taken && !enrolled.some(e => e.code === c.code);
    }
    const coreNeeded = allCourses.filter(c => c.track === 'Core' && notTakenOrEnrolled(c));
    const itNeeded = allCourses.filter(c => c.track === 'Cybersecurity' && c.type === 'it_elective' && notTakenOrEnrolled(c));
    const nonItNeeded = allCourses.filter(c => c.track === 'Cybersecurity' && c.type === 'non_it_elective' && notTakenOrEnrolled(c));
    const capstoneNeeded = allCourses.filter(c => c.type === 'capstone' && notTakenOrEnrolled(c));
    // Pick only the "capstone", not "thesis"
    const realCapstone = capstoneNeeded.find(c => !/thesis/i.test(c.title));

    // 5. List all semesters (expand as needed)
    // Can use a utility to generate based on the current date
    const semesters = [
        "Fall 2023", "Spring 2024", "Summer 2024",
        "Fall 2024", "Spring 2025", "Summer 2025",
        "Fall 2025", "Spring 2026"
    ];

    // 6. Build a plan: start with taken & enrolled, then fill needed
    const plan = {};
    // Start by copying taken and enrolled into plan
    semesters.forEach(sem => plan[sem] = []);
    takenCourses.forEach(c => plan[c.taken]?.push({ ...c, status: 'Taken' }));
    enrolledCourses.forEach(c => {
        // Convert 'fall' => 'Fall 2024' as needed. For now, just mark them "Enrolled"
        plan[c.enrolledTerm]?.push({ ...c, status: 'Enrolled' });
    });

    // 7. Now, add needed courses: 3 per semester, core one per term, capstone last, etc.
    // -- For simplicity, start filling from the next available semester.
    let needed = [...coreNeeded, ...itNeeded, ...nonItNeeded];
    let capstonePlaced = false;
    let semesterIdx = 0;

    while (needed.length > 0 && semesterIdx < semesters.length) {
        const sem = semesters[semesterIdx];
        let numCourses = plan[sem].length;
        // Don't fill capstone semester unless last or only 1 other course
        if (!capstonePlaced && realCapstone && semesterIdx === semesters.length - 1) {
            plan[sem].push({ ...realCapstone, status: 'Planned' });
            capstonePlaced = true;
            numCourses++;
        }
        while (numCourses < 3 && needed.length > 0) {
            const course = needed.shift();
            plan[sem].push({ ...course, status: 'Planned' });
            numCourses++;
            // If this is the last semester and only capstone is allowed, stop adding
            if (capstonePlaced && semesterIdx === semesters.length - 1 && numCourses >= 2) break;
        }
        semesterIdx++;
    }

    // If capstone still not placed, put it last
    if (!capstonePlaced && realCapstone) {
        plan[semesters[semesters.length - 1]].push({ ...realCapstone, status: 'Planned' });
    }

    // 8. Render the plan as columns or rows
    let html = `<div class="row row-cols-1 row-cols-md-4 g-4">`;
    semesters.forEach(sem => {
        if (plan[sem].length === 0) return;
        html += `<div class="col"><div class="card h-100 d-flex flex-column">`;
        html += `<div class="card-body flex-grow-0 d-flex align-items-end" style="height: 70px;"><h5 class="card-title text-center w-100 border-bottom pb-2 m-0">${sem}</h5></div>`;
        html += `<div class="card-body pt-3 px-2 flex-grow-1" style="overflow-y: auto; max-height: 50vh;">`;
        plan[sem].forEach(c => {
            html += `<div class="mb-2">
        <strong>${c.title}</strong> <span class="badge bg-${
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
});
