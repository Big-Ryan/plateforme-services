package com.plateforme.common.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiError {

    private int status;
    private String error;
    private String message;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime timestamp;

    private String path;
    private List<FieldError> fieldErrors;
    private Map<String, Object> details;

    @Getter
    @Builder
    public static class FieldError {
        private String field;
        private Object rejectedValue;
        private String message;
    }
}
