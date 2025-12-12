package com.erp.translation.graphql;

import com.netflix.graphql.dgs.DgsScalar;
import graphql.GraphQLContext;
import graphql.execution.CoercedVariables;
import graphql.language.StringValue;
import graphql.language.Value;
import graphql.schema.Coercing;
import graphql.schema.CoercingParseLiteralException;
import graphql.schema.CoercingParseValueException;
import graphql.schema.CoercingSerializeException;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@DgsScalar(name = "DateTime")
public class DateTimeScalar implements Coercing<Instant, String> {

    @Override
    public String serialize(Object dataFetcherResult, GraphQLContext graphQLContext, Locale locale) 
            throws CoercingSerializeException {
        if (dataFetcherResult instanceof Instant) {
            return DateTimeFormatter.ISO_INSTANT.format((Instant) dataFetcherResult);
        }
        throw new CoercingSerializeException("Expected Instant but got " + dataFetcherResult.getClass());
    }

    @Override
    public Instant parseValue(Object input, GraphQLContext graphQLContext, Locale locale) 
            throws CoercingParseValueException {
        if (input instanceof String) {
            return Instant.parse((String) input);
        }
        throw new CoercingParseValueException("Expected String but got " + input.getClass());
    }

    @Override
    public Instant parseLiteral(Value<?> input, CoercedVariables variables, 
                                 GraphQLContext graphQLContext, Locale locale) 
            throws CoercingParseLiteralException {
        if (input instanceof StringValue) {
            return Instant.parse(((StringValue) input).getValue());
        }
        throw new CoercingParseLiteralException("Expected StringValue but got " + input.getClass());
    }
}
