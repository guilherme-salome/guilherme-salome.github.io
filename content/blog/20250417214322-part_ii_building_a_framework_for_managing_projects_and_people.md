+++
title = "Part II - Building a Framework for Managing Projects and People"
author = ["Guilherme Salome"]
lastmod = 2025-04-17T21:47:09-04:00
tags = ["org-mode", "org-roam"]
categories = ["management", "emacs"]
draft = false
+++

## Introduction {#introduction}

As someone who frequently manages people and projects, I've long felt the need for a cohesive system within Emacs—one that ties together projects, tasks, and people, leveraging Org-mode’s power. Over the past few weeks, I've started building an Emacs package that aims to support my workflow around these needs.

**This is a first draft**: a collection of functions, experiments, and utilities. The architecture—and even some core concepts—will certainly evolve as I refine my ideas and adapt them to real-world usage. My goal with this article is to document my process and thinking as I go, in the spirit of open development and learning in public. Expect follow-up posts as this framework crystallizes!

You can follow development or try the code from the public repository: <https://github.com/guilherme-salome/management>


## Core Concepts {#core-concepts}

The big idea is to:

-   Centralize information about projects and people using _Org-roam_
-   Synchronize and manage project tasks, project status, and personal assignments
-   Integrate with external project management tools (like Jira)
-   Visualize assignments, tasks, and progress directly within Org files

The current draft is organized into several files and areas of functionality:


### 1. Utilities for Navigating Org Trees {#1-dot-utilities-for-navigating-org-trees}

At the heart of this framework are functions to find or create outline headings within org files programmatically—ensuring, for example, that sections like "Planning" or "Working On" exist and are nested correctly. The main utility function for this is `management-goto-or-create-org-outline-path`.


### 2. "Working On"—Automatic Personal Task Views {#2-dot-working-on-automatic-personal-task-views}

Each person (represented as an Org-roam node) maintains a "Working On" section, listing all their active tasks from across projects. The function `management-people-update-working-on` automates this, crawling all project files, finding tasks assigned to the current person, and updating their view. This makes it easy to get a snapshot of someone's current workload without manual tracking.


### 3. Project &amp; Task Creation with Org-roam &amp; Org-capture {#3-dot-project-and-task-creation-with-org-roam-and-org-capture}

The framework uses Org-roam capture templates for both projects and people, providing consistent structure out of the box. Similarly, there are org-capture templates for various task types (deliveries, enhancements, requests, backlog), as well as discussion and progress logs. For task selection and linking, `management-select-task-from-projects-and-create-link` provides user-friendly interfaces.


### 4. Jira Integration (Alpha Stage) {#4-dot-jira-integration--alpha-stage}

A central experiment is connecting Org-mode project trees to Jira, fetching data from Jira APIs and mapping tasks/epics to Org outlines. Functions such as `management-jira-update-planning` and `management-jira-get-epics` are early attempts at keeping project outlines in sync with external tools. Authentication is handled via properties and `~/.authinfo`, keeping credentials secure.


### 5. Discussion &amp; Progress Sections {#5-dot-discussion-and-progress-sections}

Every project and person Org node features a "Discussions" and "Progress" section, structured for rapid note-taking and easy review. To help with reporting and tracking, the function `management-get-discussions` extracts chronological logs or discussion notes from a file.


## Usage Highlights {#usage-highlights}

-   _Creating a new project or person_: Use the provided Org-roam capture templates for standardized structure.
-   _Assigning tasks_: Org-capture templates guide you through adding tasks to the correct project and section.
-   _Aggregating tasks per person_: Use `management-people-update-working-on` to refresh the “Working On” list and see all tasks assigned to a given person.
-   _Syncing with Jira_: Experiment with functions like `management-jira-update-planning`, following setup instructions for Jira integration in your `~/.authinfo`.


## Next Steps {#next-steps}

-   Further solidify the framework, converging from rapid prototype to stable workflows.
-   Enhance interactive dashboards and summaries within Emacs.
-   Robustify Jira and third-party integration.
-   Expand documentation and publish more guides as workflows become clear.


## Conclusion {#conclusion}

This package is very much a work in progress. Both the code and underlying ideas are open to change, reflecting what I learn in my real management work. I plan to document each iteration and encourage feedback and collaboration.

If you have feedback, suggestions, or your own approaches, please reach out—or follow the repository for frequent updates: <https://github.com/guilherme-salome/management>

Stay tuned for further articles as the framework matures!
