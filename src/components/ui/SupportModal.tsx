"use client";

import React from "react";
import { useForm, ValidationError } from "@formspree/react";
import { X, Send, CheckCircle } from "lucide-react";
import styles from "./SupportModal.module.css";

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
    const [state, handleSubmit] = useForm("mbddlggg");

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    <X size={24} strokeWidth={2} />
                </button>

                {state.succeeded ? (
                    <div className={styles.successContainer}>
                        <div className={styles.successIcon}>
                            <CheckCircle size={64} strokeWidth={1.5} />
                        </div>
                        <h2 className={styles.successTitle}>Message Sent!</h2>
                        <p className={styles.successText}>
                            Thanks for reaching out! We'll get back to you as soon as possible.
                        </p>
                        <button className={styles.submitButton} onClick={onClose}>
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        <div className={styles.header}>
                            <h2 className={styles.title}>Get Support</h2>
                            <p className={styles.subtitle}>
                                Have a question or need help? We'd love to hear from you.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="email" className={styles.label}>
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    placeholder="your@email.com"
                                    className={styles.input}
                                    required
                                />
                                <ValidationError
                                    prefix="Email"
                                    field="email"
                                    errors={state.errors}
                                    className={styles.error}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label htmlFor="subject" className={styles.label}>
                                    Subject
                                </label>
                                <input
                                    id="subject"
                                    type="text"
                                    name="subject"
                                    placeholder="How can we help?"
                                    className={styles.input}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label htmlFor="message" className={styles.label}>
                                    Message
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    placeholder="Tell us more about your question or issue..."
                                    className={styles.textarea}
                                    rows={5}
                                    required
                                />
                                <ValidationError
                                    prefix="Message"
                                    field="message"
                                    errors={state.errors}
                                    className={styles.error}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={state.submitting}
                                className={styles.submitButton}
                            >
                                {state.submitting ? (
                                    "Sending..."
                                ) : (
                                    <>
                                        <Send size={18} strokeWidth={2} />
                                        Send Message
                                    </>
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
