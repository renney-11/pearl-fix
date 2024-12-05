import mongoose, { Schema, Document } from 'mongoose';

export interface IAvailability extends Document {
    workingHours: {
        
    };
    workDays: string[];
}

const AvailabilitySchema: Schema = new Schema({
    workingHours: {
        type: [Date],
        required: true,
        validate: {
          validator: function (hours: Date[]) {
            return hours.every(hour => {
              const minutes = hour.getMinutes();
              const validHour = hour.getHours();
              return minutes === 0 && validHour >= 7 && validHour <= 16;
            });
          },
          message: 'Working hours must be on the hour and between 07:00 and 16:00.',
        },
    },
    workDays: {
        type: [String],
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        required: true,    
    },
})