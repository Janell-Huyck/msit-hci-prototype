---
layout: default
title: Summer Courses
permalink: /summer.html

semester: summer
modality:
track:
---

{% include top_controls.html %}

<div class="container-fluid" style="height: 70vh;">
  <div class="row row-cols-1 row-cols-md-4 h-100 align-items-stretch">
    {% assign core_summer = site.data.courses.core | where: "semesters","Summer" %}
    {% assign it_summer = site.data.courses.it_electives | where: "semesters","Summer" %}
    {% assign non_it_summer = site.data.courses.non_it_electives | where: "semesters","Summer" %}
    {% assign capstone_summer = site.data.courses.capstone | where: "semesters","Summer" %}

    {% include course_column.html heading="Core Courses" courses=core_summer %}
    {% include course_column.html heading="Faculty-Approved IT Electives" courses=it_summer %}
    {% include course_column.html heading="Faculty-Approved Non-IT Electives" courses=non_it_summer %}
    {% include course_column.html heading="Capstone/Thesis" courses=capstone_summer %}
  </div>
</div>
