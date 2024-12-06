import type { RequestHandler } from "express";
import Availability from "../models/Availability";
import Booking from "../models/Booking";

/**
 * Patient creates a booking (books a time slot)
 */
export const createBooking: RequestHandler = async (req, res): Promise<void> => {
  const { dentistId, patientId, clinicId, timeSlot } = req.body;

  try {
    // Validate required fields
    if (!dentistId || !patientId || !clinicId || !timeSlot?.start || !timeSlot?.end) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    // Find dentist availability
    const availability = await Availability.findOne({ dentistId });
    if (!availability) {
      res.status(404).json({ message: "Dentist availability not found" });
      return;
    }

    // Check if the time slot is available
    const slot = availability.timeSlots.find(
      (slot) =>
        slot.start.toISOString() === new Date(timeSlot.start).toISOString() &&
        slot.end.toISOString() === new Date(timeSlot.end).toISOString() &&
        slot.status === "available"
    );

    if (!slot) {
      res.status(400).json({ message: "The selected time slot is unavailable." });
      return;
    }

    // Create the booking
    const booking = new Booking({
      dentistId,
      patientId,
      clinicId,
      timeSlot,
      status: "booked",
    });

    await booking.save();

    // Update the time slot to "booked"
    slot.status = "booked";
    await availability.save();

    res.status(201).json({
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Patient cancels a booking
 */
export const cancelBookingByPatient: RequestHandler = async (req, res): Promise<void> => {
  const { bookingId } = req.params;

  try {
    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    // Ensure the booking belongs to the patient making the request
    if (req.body.patientId !== booking.patientId) {
      res.status(403).json({ message: "You can only cancel your own bookings." });
      return;
    }

    // Update the booking status
    await Booking.findByIdAndDelete(bookingId);

    // Update the associated time slot to "available"
    const availability = await Availability.findOne({ dentistId: booking.dentistId });
    if (availability) {
      const slot = availability.timeSlots.find(
        (slot) =>
          slot.start.toISOString() === booking.timeSlot.start.toISOString() &&
          slot.end.toISOString() === booking.timeSlot.end.toISOString()
      );

      if (slot) {
        slot.status = "available";
        await availability.save();
      }
    }

    res.status(200).json({
      message: "Booking canceled successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Dentist cancels a booking
 */
export const cancelBookingByDentist: RequestHandler = async (req, res): Promise<void> => {
  const { bookingId } = req.params;

  try {
    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    // Ensure the booking belongs to the dentist making the request
    if (req.body.dentistId !== booking.dentistId) {
      res.status(403).json({ message: "You can only cancel bookings for your own schedule." });
      return;
    }

    // Update the booking status
    await Booking.findByIdAndDelete(bookingId);

    // Update the associated time slot to "available"
    const availability = await Availability.findOne({ dentistId: booking.dentistId });
    if (availability) {
      const slot = availability.timeSlots.find(
        (slot) =>
          slot.start.toISOString() === booking.timeSlot.start.toISOString() &&
          slot.end.toISOString() === booking.timeSlot.end.toISOString()
      );

      if (slot) {
        slot.status = "available";
        await availability.save();
      }
    }

    res.status(200).json({
      message: "Booking canceled successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
