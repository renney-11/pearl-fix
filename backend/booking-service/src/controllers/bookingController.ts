import { RequestHandler } from "express";
import Booking from "../models/Booking";
import { IBooking } from "../models/Booking";
import { MQTTHandler } from "../mqtt/MqttHandler";
import mongoose from "mongoose";

export const createBooking: RequestHandler = async (req, res): Promise<void> => {
    const { dentistId, patientId, clinicId, timeSlot, notes } = req.body;
  
    try {
      if (!dentistId || !clinicId || !timeSlot?.start || !timeSlot?.end) {
        res.status(400).json({ message: "Missing required fields" });
        return;
      }
      const overlappingBooking = await Booking.findOne({
        dentistId,
        "timeSlot.start": { $lt: new Date(timeSlot.end) },
        "timeSlot.end": { $gt: new Date(timeSlot.start) },
      });
  
      if (overlappingBooking) {
        res.status(400).json({
          message: "The dentist is already booked for the selected time slot.",
        });
        return;
      }
  
      const booking = new Booking({
        dentistId,
        patientId,
        clinicId,
        timeSlot,
        notes,
      });
  
      await booking.save();
  
      res.status(201).json({
        message: "Booking created successfully",
        booking,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  };


  export const getAllBookings: RequestHandler = async (req, res): Promise<void> => {
    try {
      const bookings = await Booking.find();
      res.status(200).json({ bookings });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  };

  export const getBookingById: RequestHandler = async (req, res): Promise<void> => {
    const { id } = req.params;
  
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Invalid booking ID" });
        return;
      }
  
      const booking = await Booking.findById(id);
      if (!booking) {
        res.status(404).json({ message: "Booking does not exist or was not found" });
        return;
      }
  
      res.status(200).json({ booking });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "An unexpected server error occurred" });
    }
  };

export const updateBookingStatus: RequestHandler = async (req, res): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const validStatuses = ["available", "booked"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: "Invalid status value" });
      return;
    }

    const booking = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    res.status(200).json({
      message: "Booking status updated successfully",
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

