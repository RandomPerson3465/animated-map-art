import { Tooltip } from 'bootstrap';

// https://www.w3schools.com/bootstrap5/bootstrap_tooltip.php
export default function () {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new Tooltip(tooltipTriggerEl)
    });
}