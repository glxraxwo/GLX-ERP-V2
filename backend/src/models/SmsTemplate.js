import mongoose from 'mongoose';

const smsTemplateSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'Template title is required'], 
        trim: true 
    },
    content: { 
        type: String, 
        required: [true, 'Template message content is required'], 
        trim: true 
    },
    category: { 
        type: String, 
        default: 'general', 
        trim: true 
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    isDefault: { 
        type: Boolean, 
        default: false 
    }
}, { timestamps: true });

const SmsTemplate = mongoose.model('SmsTemplate', smsTemplateSchema);
export default SmsTemplate;
