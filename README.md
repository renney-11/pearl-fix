
# PEARL FIX
To learn about our teams development of this project, read our [weekly assessments](https://git.chalmers.se/courses/dit355/2024/student_teams/dit356_2024_22/tooth-beacon/-/wikis/home/%7Bnew_page_title%7DWeekly-Assessments) or check out our [analysis of the bottlenecks](https://git.chalmers.se/courses/dit355/2024/student_teams/dit356_2024_22/tooth-beacon/-/wikis/home/%7Bnew_page_title%7DBottleneck-analysis-and-improvements) we had encountered.


## Purpose

Pearl Fix is a dental booking service that can be used by users across Sweden, with visually pleasing UIs for patients and dentists to use with ease. Patients looking to book their next appointment can easily do so by navigating through our map, to find their best suited clinic, and then selecting a date & time. Our site also allows for both patients and dentists to monitor their appointments, and if needed they can cancel their booked appointments. Additionally dentists can use our site to select when they are available to work. 

## Architecture
The architecture of Pearl Fix follows a **Service-Oriented Architecture (SOA)** style. With a shared database, it allows for data to be easily replicated into a redundant backup database which is to be utilized when the primary goes down. 

<details>
  <summary><strong>Component Diagram</strong></summary>
  <img src="./docs/architecture/component-diagram.png" alt="Component Diagram">
  
### Overview of component diagram:  
**Frontend (service):**   
*Client UI:* Provides a user interface for patients to interact with the application, such as booking appointments.  
*Dentist UI:* Serves as the interface for dentists, allowing them to manage their schedules, view patient bookings, and update availability.  

**API Gateway:**  
Serves as the central communication point between the frontend and backend. 

**Backend Subsystem:**   
Authentication Service: Handles user authentication processes.
Booking Service: Manages the booking workflow, such as creating availability, creating booking, canceling booking, and retrieving appointments.
Clinic Service: Manages clinic creation and retrieval.

These services interact with a shared Database for data storage and retrieval.

</details>


<details>
  <summary><strong>Sequence Diagram</strong></summary>
  <img src="./docs/architecture/sequence-diagram.png" alt="Sequence Diagram">
  This sequence diagram illustrates the end-to-end interactions between the Users, Frontend, Backend, and Database components. It covers key operations such as registration/login, finding clinics, booking appointments, and canceling bookings, and the role of the MQTT broker.
  
  ### Flow Description:
  - Actors:   
    - Dentists
    - Patients   
  - Key operations:
    - Registration/Login
      - Frontend:   
        User (dentist or patient) submits credentials through the Dentist UI or Patient UI.   
        Credentials are published to the MQTT Broker for processing.
      - Backend:    
        Auth-service queries the database to validate the provided credentials.   
        Database: Retrieves user data for authentication.   
        If the credentials are correct, a success message is sent back. Otherwise, an error response is returned.    
    - Finding a Clinic
      - Frontend:   
        The patient sends a request to find a clinic.   
        Request is published to the MQTT Broker.   
      - Backend:    
        Clinic-service queries the database for clinic data.   
        The database returns relevant clinic data.   
        A success response with clinic details is sent back to the UI.   
    - Booking an Appointment    
      - Frontend:    
        The patient sends a booking request, which is published to the MQTT Broker.  
      - Backend:    
        Booking-service queries the database to verify available booking slots.   
        The database retrieves availability data and confirms the booking.    
        A success response is sent back to the UI.   
    - Cancelling a Booking   
      - Frontend:   
        The user sends a booking cancellation request.   
        Request is published to the MQTT Broker.   
      - Backend:   
        Booking-service queries the database to delete the booking record.   
        The database removes the booking data.    
        A success confirmation email is sent back to the UI.    
  - Error Handling
    - If incorrect credentials are provided during login, the system will send an error response back to the user.

</details>

<details>
  <summary><strong>ER Diagram</strong></summary>
  <img src="./docs/architecture/ER-diagram.png" alt="ER Diagram">
  The ER-diagram aims to show the relationships between the different entities in the system and serves as a template when we make the corresponding models.   


</details>


<details>
  <summary><strong>Deployment Diagram</strong></summary>
  <img src="./docs/architecture/deployment-diagram.png" alt="Deployment Diagram">
  The deployment diagram includes the physical deployment of the system's components and services across various nodes. It provides an understanding of how the logical components from the architecture are mapped to the underlying execution environment.

</details>

## Social Contract

Our team adheres to a [Social Contract](https://docs.google.com/document/d/1dc2CV5OAU8KKNEKRaAqYfxCZHewU8BqBGJ-avQ7yEzc/edit?usp=sharing) that defines our core values, commitments, and collaborative principles. This document guides how we work together to ensure respect, accountability, and a positive team environment.

## Development Team


| Name | Username |
| ------ | ------ |
| Celina Labbaci|@labbaci     |
| Manely Abbasi| @manely     |
| Renaa Paktiani| @renaa  |
| Saba Legesse |@sabal |



