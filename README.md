# Railway Track Monitoring System with ESP32 and Firebase

## Overview
This project is a smart **Railway Track Monitoring System** designed using an **ESP32** microcontroller integrated with multiple sensors and GPS, along with Firebase real-time database for cloud data storage and visualization.

The system continuously monitors critical parameters such as fire presence, water flooding, obstacle detection, and track cracks. It collects sensor data and GPS coordinates, then sends real-time updates to Firebase, enabling remote monitoring of railway track safety and maintenance.

---

## Key Features
- **Fire detection** using a Fire Sensor
- **Water level detection** to identify flooding on tracks
- **Obstacle detection** using IR sensor
- **Crack detection** with ultrasonic sensors measuring distances and severity thresholds
- **GPS module** integration to track the exact location of anomalies
- **Real-time data upload** and monitoring via Firebase Realtime Database
- **User-friendly LCD display** shows sensor status locally on the ESP32 device

---

## Hardware Components
- ESP32 development board
- Fire Sensor
- Water Sensor
- IR Sensor
- Ultrasonic sensors (HC-SR04 or compatible)
- GPS Module (Neo-6M)
- LCD Display with I2C interface

---

## Software Components
- Arduino IDE for programming ESP32
- Libraries used:
  - `Wire.h` and `LiquidCrystal_I2C` for LCD control
  - `WiFi.h` for network connectivity
  - `TinyGPS++` for GPS data parsing
  - `Firebase_ESP_Client` for Firebase integration

---
## web page components
- Home page contains last detected anomalie(crack , fire , flood , other) location 
- Past anomalies page contains record of the previous detected anomalies and resolved anomalies are marked 
- prediction's page template is added - future scope - need to collect data and make an analysis on the collected data for future predections on cracks , temp , floods , obstacles 
  and other !

---

## Database strcture 
- ![image](https://github.com/user-attachments/assets/a829bb42-b604-4fbd-9c50-bac9f9c9179a)

## How It Works
1. The ESP32 connects to Wi-Fi using provided credentials.
2. Sensor readings are continuously gathered: fire, water, IR obstacle detection, and ultrasonic distance for crack severity.
3. GPS coordinates are read and validated.
4. Sensor data and GPS location are displayed on the LCD.
5. All data is uploaded in real-time to Firebase Realtime Database.
6. Authorized users can monitor the railway track conditions remotely through WebPage.

---
