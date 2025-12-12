package com.erp.company.graphql;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.netflix.graphql.dgs.DgsScalar;
import graphql.GraphQLContext;
import graphql.execution.CoercedVariables;
import graphql.language.*;
import graphql.schema.Coercing;
import graphql.schema.CoercingParseLiteralException;
import graphql.schema.CoercingParseValueException;
import graphql.schema.CoercingSerializeException;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.*;

@DgsScalar(name = "JSON")
public class JsonScalar implements Coercing<Object, Object> {

    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public Object serialize(Object dataFetcherResult, GraphQLContext graphQLContext, Locale locale) 
            throws CoercingSerializeException {
        return dataFetcherResult;
    }

    @Override
    public Object parseValue(Object input, GraphQLContext graphQLContext, Locale locale) 
            throws CoercingParseValueException {
        if (input instanceof Map || input instanceof List) {
            return input;
        }
        if (input instanceof String) {
            try {
                return objectMapper.readValue((String) input, new TypeReference<Map<String, Object>>() {});
            } catch (Exception e) {
                throw new CoercingParseValueException("Failed to parse JSON string", e);
            }
        }
        return input;
    }

    @Override
    public Object parseLiteral(Value<?> input, CoercedVariables variables, 
                                GraphQLContext graphQLContext, Locale locale) 
            throws CoercingParseLiteralException {
        return parseLiteralValue(input);
    }

    private Object parseLiteralValue(Value<?> input) {
        if (input instanceof NullValue) {
            return null;
        }
        if (input instanceof StringValue) {
            return ((StringValue) input).getValue();
        }
        if (input instanceof IntValue) {
            return ((IntValue) input).getValue().intValue();
        }
        if (input instanceof FloatValue) {
            return ((FloatValue) input).getValue().doubleValue();
        }
        if (input instanceof BooleanValue) {
            return ((BooleanValue) input).isValue();
        }
        if (input instanceof ArrayValue) {
            List<Object> result = new ArrayList<>();
            for (Value<?> value : ((ArrayValue) input).getValues()) {
                result.add(parseLiteralValue(value));
            }
            return result;
        }
        if (input instanceof ObjectValue) {
            Map<String, Object> result = new LinkedHashMap<>();
            for (ObjectField field : ((ObjectValue) input).getObjectFields()) {
                result.put(field.getName(), parseLiteralValue(field.getValue()));
            }
            return result;
        }
        throw new CoercingParseLiteralException("Unexpected literal type: " + input.getClass());
    }
}
