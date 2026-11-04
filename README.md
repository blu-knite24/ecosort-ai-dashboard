# EcoSort AI Dashboard

Build EcoSort AI – Intelligent Waste Segregation Dashboard



Develop a complete, responsive, professional IoT web application named EcoSort AI.



1. Project objective



EcoSort AI is an AI-powered automated waste segregation system that identifies and separates waste into four categories:



- Plastic

- Paper

- Metal

- Biodegradable



The website will monitor the physical segregation machine, display real-time sensor readings, show AI classification results, track waste statistics and provide machine controls.



This is an actual IoT project. Build the website with a backend architecture that can eventually communicate with ESP32 hardware and an AI inference computer through MQTT.



2. Design requirements



Create a premium, modern IoT dashboard.



Visual direction:



- Dark futuristic interface.

- Deep navy background (#0B1220).

- Cyan and teal accents.

- Subtle purple and blue highlights.

- Glass-like panels with restrained borders.

- Modern typography such as Inter.

- Lucide icons.

- Smooth but subtle transitions.

- Responsive desktop, tablet and mobile layouts.



Avoid:



- Generic landing-page designs.

- Excessive gradients.

- Oversized decorative illustrations.

- Unnecessary animations.

- Excessive empty space.

- Emoji-based navigation icons.



The interface should resemble a professional industrial IoT monitoring platform.



3. Main navigation



Create a collapsible sidebar containing:



1. Overview

2. Live Monitoring

3. Waste Analytics

4. Classification History

5. Device Management

6. Bin Management

7. MQTT Configuration

8. Settings



Include the EcoSort AI logo and project name in the sidebar.



4. Overview dashboard



Display:



- Total waste processed (kg).

- Total objects classified.

- Plastic waste collected (kg).

- Paper waste collected (kg).

- Metal waste collected (kg).

- Biodegradable waste collected (kg).

- Current machine status.

- MQTT connection status.

- ESP32 connection status.

- Last device communication time.



Include:



- Category distribution doughnut chart.

- Daily waste collection bar chart.

- Recent classification activity.

- Device health summary.

- Bin capacity indicators.



Do not use hardcoded production statistics. Initially, use clearly labelled simulated demonstration data.



5. Live Monitoring



Create a real-time monitoring page.



Display:



- Latest detected waste object.

- Captured object image or camera preview placeholder.

- Predicted waste category.

- AI confidence percentage.

- Weight of detected object.

- Metal sensor status.

- Moisture sensor reading.

- Object detection status.

- Conveyor status.

- Sorting mechanism status.



Show a chronological activity feed of detected and sorted objects.



6. Waste Analytics



Create charts and reports for:



- Category-wise waste distribution.

- Daily and weekly waste collection.

- Monthly waste collection.

- Total weight by category.

- Number of objects processed.

- Recycling and biodegradable waste trends.



Allow date-range filtering.



7. Classification History



Create a searchable and filterable table containing:



- Timestamp.

- Object name.

- Predicted category.

- AI confidence.

- Object weight.

- Sorting result.

- Classification status.



Include category filters and date filters.



8. Device Management



Display device cards for:



- ESP32 controller.

- Camera and AI processor.

- Metal detection sensor.

- Moisture sensor.

- IR object detection sensor.

- Conveyor motor.

- Servo sorting mechanism.



Show connection status, last communication and available telemetry.



9. Bin Management



Create four individual bin cards:



- Plastic bin.

- Paper bin.

- Metal bin.

- Biodegradable bin.



Each card should display:



- Current fill percentage.

- Collected weight.

- Capacity status.

- Full-bin warning.



Show a warning when a bin reaches 80% capacity and a critical alert at 95%.



10. Machine controls



Provide:



- Start machine.

- Pause machine.

- Resume machine.

- Stop machine.



Commands must be sent to the backend through an authenticated API and MQTT.



Display command acknowledgement from the physical device. Never show a command as successfully executed merely because it was sent.



Include a confirmation dialog for stopping the machine.



11. Backend architecture



Use:



- Node.js.

- Express.js.

- MQTT.js.

- Mosquitto MQTT broker.

- Socket.IO for real-time browser updates.

- SQLite initially for persistent classification history and statistics.



Architecture:



ESP32 and AI computer → MQTT Broker → Node.js Backend → Socket.IO → Website.



The browser must not contain MQTT administrator credentials.



12. MQTT topic structure



Use the following topics:



ecosort/device01/telemetry

ecosort/device01/classification

ecosort/device01/bins

ecosort/device01/status

ecosort/device01/command

ecosort/device01/ack



Support JSON messages.



Classification example:



{

"object": "tin food container",

"category": "metal",

"confidence": 0.96,

"weightGrams": 42

}



Telemetry example:



{

"totalWeightKg": 12.45,

"counts": {

"plastic": 12,

"paper": 8,

"metal": 4,

"organic": 10

},

"moisturePercent": 63,

"metalDetected": true,

"objectDetected": true,

"conveyorState": "running"

}



13. Data handling



Implement:



- MQTT reconnection.

- Input validation.

- Device heartbeat monitoring.

- Offline device detection.

- Persistent classification records.

- Duplicate-event protection using unique event IDs.

- Error handling.

- Real-time dashboard updates.

- Command acknowledgements.

- Historical analytics.



Never fabricate live sensor readings.



14. Development requirements



Build actual working pages and backend functionality, not just a visual mockup.



Separate:



- Frontend components.

- Backend services.

- MQTT service.

- Database models.

- API routes.

- Configuration files.



Create a simulated MQTT device publisher for testing without physical hardware.



Include a README with installation instructions, environment configuration, MQTT topic documentation and deployment instructions.



15. Expected result



Deliver a fully working EcoSort AI web application with:



- Professional responsive dashboard.

- Functional navigation.

- Working charts.

- Real-time MQTT integration.

- Historical classification database.

- Device monitoring.

- Bin monitoring.

- Machine control interface.

- Demo simulation mode.

- Clear separation between simulated and actual hardware data.



Prioritize functional architecture, maintainable code and a consistent professional UI.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4a2cf718-8180-40bd-b495-6e931825f261).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
