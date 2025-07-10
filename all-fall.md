---
layout: default
title: Fall Courses
permalink: /all-fall.html
---

{% include top_controls.html %}

<div class="container-fluid">
  <div class="row row-cols-1 row-cols-md-4 g-4">
    {% assign core_fall = site.data.courses.core | where_exp: "c", "c.semesters contains 'Fall'" %}
    {% assign it_fall = site.data.courses.it_electives | where_exp: "c", "c.semesters contains 'Fall'" %}
    {% assign non_it_fall = site.data.courses.non_it_electives | where_exp: "c", "c.semesters contains 'Fall'" %}
    {% assign capstone_fall = site.data.courses.capstone | where_exp: "c", "c.semesters contains 'Fall'" %}

    {% include course_column.html heading="Core Courses" courses=core_fall %}
    {% include course_column.html heading="Faculty-Approved IT Electives" courses=it_fall %}
    {% include course_column.html heading="Faculty-Approved Non-IT Electives" courses=non_it_fall %}
    {% include course_column.html heading="Capstone/Thesis" courses=capstone_fall %}
  </div>
</div>
